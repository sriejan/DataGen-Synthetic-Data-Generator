import streamlit as st  
import pandas as pd
import numpy as np
import openai
from sdv.single_table import CTGANSynthesizer, TVAESynthesizer, CopulaGANSynthesizer
import json
import math
from io import StringIO
import logging
from typing import List, Dict, Any
import warnings
import sys
import traceback
from datetime import datetime
import os
from dotenv import load_dotenv



# Set up logging
def setup_logging():
    log_filename = f"gan_training_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_filename),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()
# Initialize session state variables
if 'generated_data' not in st.session_state:
    st.session_state.generated_data = None
if 'gan_data' not in st.session_state:
    st.session_state.gan_data = None
if 'metadata' not in st.session_state:
    st.session_state.metadata = None
if 'column_types' not in st.session_state:
    st.session_state.column_types = {}
if 'id_column' not in st.session_state:
    st.session_state.id_column = None

# Page configuration
st.set_page_config(
    page_title="Advanced Synthetic Data Generator",
    page_icon="🧊",
    layout="wide"
)
# -------------------------------
# NEW: Prompt Engineering Agent using Google Gemini 2.0 Flash
# -------------------------------

# Import the Google GenAI SDK (Gemini 2.0 Flash)
from google import genai

# Initialize the Gemini client
gemini_client = genai.Client(
    api_key="AIzaSyAYWzyyBgvc_y5vtgHtOe7T3fHd42QRX2Q",
    http_options={"api_version": "v1alpha"},
)


# -------------------------------
# Prompt Engineering Agent using Google Gemini 2.0 Flash

def engineer_prompt(user_prompt: str) -> str:
    """
    Uses Google Gemini 2.0 Flash to generate an engineered prompt.
    This agent takes a dataset description without explicit column names
    and returns a modified prompt that includes suggested column names,
    data types, realistic value ranges, and correlations.
    """
    system_instruction = (
        "You are a prompt engineering expert for synthetic data generation. "
        "Given the following dataset description that does not include explicit column names, "
        "design a complete prompt for a synthetic data generator. Include suggested column names, "
        "their data types, realistic value ranges, and any correlations. Do not include any row counts. "
        "Output only the engineered prompt with a CSV header and clear instructions without any markdown formatting (i.e. do not include triple backticks or any other delimiters at the start or end)"
    )
    user_instructions = f"Dataset description: {user_prompt}"
    
    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash",  # Using Gemini 2.0 Flash as per the latest documentation :contentReference[oaicite:0]{index=0}
        contents=[system_instruction, user_instructions]
    )
    engineered = response.text.strip()
    return engineered

# -------------------------------
# Data Generation using Gemini instead of OpenAI

def generate_data_chunk(prompt: str, rows: int, chunk_size: int = 100) -> str:
    """
    Generates a chunk of synthetic CSV data using Google Gemini 2.0 Flash.
    The prompt should be engineered (or raw) and is used to generate the data.
    """
    system_prompt = (
        "You are a data generation expert. Generate synthetic data that:\n"
        "1. Strictly follows CSV format\n"
        "2. Maintains realistic value distributions\n"
        "3. Preserves specified correlations\n"
        "4. Contains no missing values\n"
        "Respond only with the CSV data, no additional text and without any markdown formatting (i.e. do not include triple backticks or any other delimiters at the start or end"
    )
    user_prompt = (
        f"Generate {rows} rows of synthetic data based on the following prompt:\n{prompt}\n\n"
        "Output requirements:\n"
        "- Valid CSV format with header\n"
        "- Realistic and consistent values\n"
        "- No NULL or missing values\n"
        "- Maintain logical relationships between fields"

    )
    print(user_prompt)
    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[system_prompt, user_prompt]
    )
    return response.text.strip()

# -------------------------------
# Import the unified Metadata class
from sdv.metadata import Metadata

def create_metadata(data: pd.DataFrame, categorical_columns: List[str]) -> Metadata:
    metadata = Metadata.detect_from_dataframes(data={'default': data})
    id_column = st.selectbox(
        "Select the ID/Primary Key column (optional - select 'None' if no primary key needed):",
        options=['None'] + data.columns.tolist(),
        help="Select 'None' if you don't need any column to be a unique identifier"
    )
    if id_column != 'None':
        if len(data[id_column].unique()) == len(data):
            metadata.update_column(id_column, sdtype='id', table_name='default')
            st.success(f"{id_column} set as primary key - all values are unique")
        else:
            st.warning(f"{id_column} contains duplicate values and cannot be used as a primary key")
            st.info("Treating it as a regular numerical column instead")
            metadata.update_column(id_column, sdtype='numerical', table_name='default')
    st.write("Specify column types:")
    for column in data.columns:
        if column != id_column or id_column == 'None':
            col_type = st.selectbox(
                f"Type for {column}:",
                options=['categorical', 'numerical', 'datetime', 'boolean'],
                key=f"col_type_{column}"
            )
            metadata.update_column(column, sdtype=col_type, table_name='default')
    return metadata

# Multi-model training function
def train_synthesizer(model_choice: str, data: pd.DataFrame, params: Dict[str, Any], metadata: Metadata):
    logger.info(f"Selected model: {model_choice}")
    if model_choice == "CTGAN":
        synthesizer = CTGANSynthesizer(
            metadata,
            epochs=params['epochs'],
            batch_size=params['batch_size'],
            generator_dim=params['generator_dim'],
            discriminator_dim=params['discriminator_dim'],
            generator_lr=params['learning_rate'],
            discriminator_lr=params['learning_rate'],
            pac=params['pac']
        )
    elif model_choice == "TVAE":
        synthesizer = TVAESynthesizer(
            metadata,
            epochs=params['epochs'],
            batch_size=params['batch_size']
        )
    elif model_choice == "CopulaGAN":
        synthesizer = CopulaGANSynthesizer(
            metadata,
            epochs=params['epochs'],
            batch_size=params['batch_size'],
            generator_dim=params['generator_dim'],
            discriminator_dim=params['discriminator_dim'],
            generator_lr=params['learning_rate'],
            discriminator_lr=params['learning_rate'],
            pac=params['pac']
        )
    else:
        st.error("Invalid model selection")
        return None

    logger.info("Initializing synthesizer")
    synthesizer.fit(data)
    logger.info("Model training completed successfully")
    return synthesizer

def validate_synthetic_data(original_data: pd.DataFrame, synthetic_data: pd.DataFrame, constraints: Dict):
    validation_results = {}
    for column in original_data.columns:
        validation_results[column] = {
            'original_mean': original_data[column].mean() if pd.api.types.is_numeric_dtype(original_data[column]) else None,
            'synthetic_mean': synthetic_data[column].mean() if pd.api.types.is_numeric_dtype(synthetic_data[column]) else None,
            'original_std': original_data[column].std() if pd.api.types.is_numeric_dtype(original_data[column]) else None,
            'synthetic_std': synthetic_data[column].std() if pd.api.types.is_numeric_dtype(synthetic_data[column]) else None,
            'constraint_violations': 0
        }
        if column in constraints:
            if 'min' in constraints[column]:
                violations = (synthetic_data[column] < constraints[column]['min']).sum()
                validation_results[column]['constraint_violations'] += violations
            if 'max' in constraints[column]:
                violations = (synthetic_data[column] > constraints[column]['max']).sum()
                validation_results[column]['constraint_violations'] += violations
    return validation_results

# -------------------------------
# Main UI
st.title("🧠 Advanced Synthetic Data Generator")
st.markdown("Generate high-quality synthetic data using FGenerative AI and Deep Learning Concepts")

if st.button("View Training Logs"):
    try:
        with open(logger.handlers[0].baseFilename, 'r') as f:
            logs = f.read()
        st.text_area("Training Logs", logs, height=400)
    except Exception as e:
        st.error(f"Could not load logs: {str(e)}")

# --- Data Input Mode ---
st.subheader("Step 1: Dataset Specification")
data_input_mode = st.radio("Select Data Input Mode", options=["Generate from Prompt", "Upload Excel Sheet"], index=0)

if data_input_mode == "Generate from Prompt":
    with st.expander("Dataset Generation from Prompt", expanded=True):
        dataset_prompt = st.text_area("Describe your dataset requirements:",
            """Create a customer dataset with:
- customer_id (unique identifier)
- age (18-80)
- income (30000-150000)
- purchase_frequency (1-52)
- customer_segment (Basic, Premium, VIP)
- satisfaction_score (1-100)

Ensure realistic correlations between income, purchase_frequency, and customer_segment.""")
        # New checkbox: automatically use prompt engineering if columns are not specified.
        use_prompt_engineering = st.checkbox("Automatically determine column names if not provided", value=True)
        row_count = st.number_input("Number of rows to generate", min_value=100, max_value=10000, value=500, step=100)
        chunk_size = st.number_input("Chunk size for generation", min_value=50, max_value=500, value=100, step=50)
        if st.button("Generate Initial Dataset"):
            with st.spinner("Generating synthetic data..."):
                # Apply prompt engineering if enabled
                if use_prompt_engineering:
                    st.info("Running prompt engineering to determine column names and dataset structure...")
                    engineered_prompt = engineer_prompt(dataset_prompt)
                    st.code(engineered_prompt, language="text")
                else:
                    engineered_prompt = dataset_prompt
                chunks = []
                num_chunks = math.ceil(row_count / chunk_size)
                progress_bar = st.progress(0)
                for i in range(num_chunks):
                    current_chunk_size = min(chunk_size, row_count - i * chunk_size)
                    # Use the engineered prompt for every chunk to ensure consistency
                    chunk_data = generate_data_chunk(engineered_prompt, current_chunk_size)
                    if chunk_data:
                        chunks.append(chunk_data)
                    progress_bar.progress((i + 1) / num_chunks)
                full_data = "\n".join([chunks[0]] + [ "\n".join(chunk.split("\n")[1:]) for chunk in chunks[1:]])
                try:
                    st.session_state.generated_data = pd.read_csv(StringIO(full_data))
                    st.success("Initial dataset generated successfully!")
                    st.dataframe(st.session_state.generated_data.head())
                except Exception as e:
                    st.error(f"Error parsing generated data: {str(e)}")
                    
elif data_input_mode == "Upload Excel Sheet":
    with st.expander("Upload Your Dataset", expanded=True):
        uploaded_file = st.file_uploader("Upload an Excel or CSV file", type=["xlsx", "xls", "csv"])
        if uploaded_file is not None:
            try:
                if uploaded_file.name.endswith(('xlsx', 'xls')):
                    st.session_state.generated_data = pd.read_excel(uploaded_file)
                else:
                    st.session_state.generated_data = pd.read_csv(uploaded_file)
                st.success("Dataset uploaded successfully!")
                st.dataframe(st.session_state.generated_data.head())
            except Exception as e:
                st.error(f"Error reading the file: {str(e)}")

# --- Data Configuration Section ---
if st.session_state.generated_data is not None:
    with st.expander("Step 1.5: Data Configuration", expanded=True):
        st.subheader("Configure Column Types and Primary Key")
        id_column = st.selectbox("Select the ID/Primary Key column (optional - select 'None' if no primary key needed):",
            options=['None'] + st.session_state.generated_data.columns.tolist(),
            help="Select 'None' if you don't need any column to be a unique identifier")
        st.subheader("Specify Column Types")
        column_types = {}
        for column in st.session_state.generated_data.columns:
            if column != id_column or id_column == 'None':
                col_type = st.selectbox(f"Type for {column}:", options=['categorical', 'numerical', 'datetime', 'boolean'],
                    key=f"col_type_{column}")
                column_types[column] = col_type
        total_rows = len(st.session_state.generated_data)
        for column, col_type in column_types.items():
            if col_type == 'categorical':
                unique_count = st.session_state.generated_data[column].nunique()
                if unique_count / total_rows > 0.5:
                    st.warning(f"Column '{column}' has high cardinality ({unique_count} unique values out of {total_rows}).")
        if st.button("Apply Data Configuration"):
            try:
                metadata = Metadata.detect_from_dataframes(data={'default': st.session_state.generated_data})
                for column, col_type in column_types.items():
                    metadata.update_column(column, sdtype=col_type, table_name='default')
                if id_column != 'None':
                    if len(st.session_state.generated_data[id_column].unique()) == len(st.session_state.generated_data):
                        metadata.update_column(id_column, sdtype='id', table_name='default')
                        st.success(f"{id_column} set as primary key - all values are unique")
                    else:
                        st.warning(f"{id_column} contains duplicate values and cannot be used as a primary key")
                        st.info("Treating it as a regular numerical column instead")
                st.session_state.metadata = metadata
                st.success("Data configuration applied successfully!")
            except Exception as e:
                st.error(f"Error configuring metadata: {str(e)}")

# --- Simplified Data Transformation Step for Uploaded Datasets ---
import re

def clean_generated_code(code_text: str) -> str:
    """
    Removes markdown formatting markers such as triple backticks and triple single quotes.
    """
    # Remove any instances of triple backticks with optional language identifier.
    cleaned = re.sub(r"```(?:python)?", "", code_text)
    # Remove any instances of triple single quotes.
    cleaned = re.sub(r"'''", "", cleaned)
    return cleaned.strip()

if data_input_mode == "Upload Excel Sheet" and st.session_state.generated_data is not None:
    with st.expander("Step 1.7: Data Transformation", expanded=True):
        st.markdown("### Data Transformation")
        st.markdown("Below is a preview and schema summary of your dataset:")
        st.write(st.session_state.generated_data.describe(include='all'))
        st.dataframe(st.session_state.generated_data.head(10))
        nl_transformation = st.text_area("Describe your desired data transformations", placeholder="Enter your instructions here...")
        
        if st.button("Generate Transformation Code"):
            with st.spinner("Generating transformation code..."):
                sample_csv = st.session_state.generated_data.head(10).to_csv(index=False)
                system_prompt = (
                    "You are a data transformation expert. Generate Python Pandas code that transforms a DataFrame named 'df' "
                    "according to the following natural language instructions. Ensure the code is type-safe. "
                    "Output only the raw Python code as inline statements without any markdown formatting (do not include triple backticks, triple single quotes, or language identifiers). "
                    "Do not define any functions; write inline statements that directly modify 'df'."
                )
                user_prompt = (
                    f"Here is a sample of the data:\n{sample_csv}\n\n"
                    f"Transform the data as described:\n{nl_transformation}\n\n"
                    "Generate the transformation code following these rules: output only raw Python code with no markdown formatting, and do not use any function definitions; write inline statements that directly transform 'df'."
                )
                try:
                    response = gemini_client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=[system_prompt, user_prompt]
                    )
                    transformation_code = response.text.strip()
                    # Post-process the generated code to remove any unwanted markdown markers.
                    transformation_code = clean_generated_code(transformation_code)
                    st.markdown("### Generated Transformation Code")
                    st.code(transformation_code, language="python")
                    st.session_state.transformation_code = transformation_code
                except Exception as e:
                    st.error(f"Error generating transformation code: {str(e)}")
        
        if "transformation_code" in st.session_state:
            if st.button("Test Transformation Code"):
                with st.spinner("Testing transformation on sample data..."):
                    try:
                        local_vars = {"df": st.session_state.generated_data.head(10).copy()}
                        exec(st.session_state.transformation_code, {}, local_vars)
                        if 'df' in local_vars:
                            st.markdown("### Preview of Transformed Sample Data")
                            st.dataframe(local_vars['df'])
                            st.session_state.test_transformed = local_vars['df']
                        else:
                            st.error("The transformation code did not produce a DataFrame named 'df'.")
                    except Exception as e:
                        st.error(f"Error testing transformation code: {str(e)}")
            
            if st.button("Apply Transformation Code"):
                with st.spinner("Applying transformation code to the full dataset..."):
                    try:
                        original_data = st.session_state.generated_data.copy()
                        local_vars = {"df": st.session_state.generated_data.copy()}
                        exec(st.session_state.transformation_code, {}, local_vars)
                        if 'df' in local_vars:
                            st.session_state.generated_data = local_vars['df']
                            st.success("Data transformation applied successfully!")
                            st.dataframe(st.session_state.generated_data.head(10))
                        else:
                            st.error("The transformation code did not produce a DataFrame named 'df'. Rolling back changes.")
                            st.session_state.generated_data = original_data
                    except Exception as e:
                        st.error(f"Error applying transformation code: {str(e)}. Rolling back changes.")
                        st.session_state.generated_data = original_data




def generate_value_constraints(user_prompt: str) -> str:

    system_instruction = (
        "You are a data generation expert. Given the following dataset description, "
        "produce a JSON object representing the value constraints for each field. "
        "For each numeric field, include 'min' and 'max' values. "
        "Output only the raw JSON without any markdown formatting or triple backticks."
    )
    user_instructions = f"Dataset description: {user_prompt}"
    
    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[system_instruction, user_instructions]
    )
    json_constraints = response.text.strip()
    # If by any chance the response still contains markdown formatting, remove it.
    if json_constraints.startswith("```"):
        json_constraints = json_constraints.split("\n", 1)[-1]
    if json_constraints.endswith("```"):
        json_constraints = json_constraints.rsplit("\n", 1)[0]
    return json_constraints

def validate_json_format(json_text: str) -> bool:
    """
    Validates that the provided text is a properly formatted JSON.
    Returns True if valid, False otherwise.
    """
    try:
        json.loads(json_text)
        return True
    except Exception as e:
        st.error(f"Invalid JSON: {e}")
        return False

# -------------------------------
# In the GAN Configuration Section (within the Streamlit UI)
# Replace the static Value Constraints text area with an automatically generated one.

if st.session_state.generated_data is not None:
    with st.expander("Step 2: Model Configuration", expanded=True):
        if st.session_state.metadata is None:
            st.warning("Please configure data types and primary key in the Data Configuration section above")
    else:
            st.success("Metadata configuration detected successfully!")
        
        # Model selection widget for multi-model support
        model_choice = st.selectbox("Select Synthetic Data Generation Model", ["CTGAN", "TVAE", "CopulaGAN"], index=0)
        
        col1, col2 = st.columns([1, 2])
        with col1:
            st.subheader("Model Parameters")
            gan_params = {
                'epochs': st.slider("Training Epochs", 100, 2000, 500),
                'batch_size': st.slider("Batch Size", 64, 512, 250),
                'learning_rate': st.select_slider("Learning Rate", options=[0.0001, 0.0005, 0.001, 0.005], value=0.0005),
                'generator_dim': eval(st.text_input("Generator Architecture", "[250, 250, 250]")),
                'discriminator_dim': eval(st.text_input("Discriminator Architecture", "[250, 250, 250]")),
                'pac': st.slider("PAC", 1, 10, 5)
            }
        with col2:
            st.subheader("Data Constraints")
            if data_input_mode == "Generate from Prompt":
                # Automatically generate constraints JSON from the dataset prompt using Gemini.
                if st.button("Generate Value Constraints Automatically"):
                    with st.spinner("Generating value constraints from dataset description..."):
                        constraints_json_generated = generate_value_constraints(dataset_prompt)
                        st.session_state.generated_constraints = constraints_json_generated
                        st.success("Value constraints generated!")
                # Prefill the text area with the generated JSON (or "{}" if not generated yet)
                constraints_default = st.session_state.get("generated_constraints", "{}")
                    else:
                constraints_default = "{}"
            constraints_json = st.text_area("Value Constraints (JSON)", constraints_default, height=150)
            
            # New: Button to validate the JSON
            if st.button("Validate JSON"):
                if validate_json_format(constraints_json):
                    st.success("The JSON is valid!")
        
        if data_input_mode == "Upload Excel Sheet":
            synthetic_row_count = st.number_input("Define row count for GAN generated data", min_value=1, max_value=10000, value=st.session_state.generated_data.shape[0], step=100)
        else:
            synthetic_row_count = st.session_state.generated_data.shape[0]
        
        if st.button("Reset Column Types"):
            st.session_state.metadata = None
            st.session_state.column_types = {}
            st.session_state.id_column = None
            st.experimental_rerun()
        
        if st.button("Train Custom Model"):
            with st.spinner("Training Custom Model..."):
                try:
                    logger.info("Starting Model training process")
                    constraints = json.loads(constraints_json)
                    logger.info(f"Loaded constraints: {constraints}")
                    logger.info("Current metadata configuration:")
                    logger.info(json.dumps(st.session_state.metadata.to_dict(), indent=2))
                    synthesizer = train_synthesizer(model_choice, st.session_state.generated_data, gan_params, st.session_state.metadata)
                    logger.info("Generating synthetic data")
                    st.session_state.gan_data = synthesizer.sample(synthetic_row_count)
                    logger.info(f"Generated synthetic data shape: {st.session_state.gan_data.shape}")
                    logger.info("Validating synthetic data")
                    validation_results = validate_synthetic_data(st.session_state.generated_data, st.session_state.gan_data, constraints)
                    logger.info(f"Validation results: {validation_results}")
                    st.success("Model training completed!")
    except Exception as e:
                    logger.error("Error in Model training process:")
        logger.error(traceback.format_exc())
                    st.error(f"Model failed: {str(e)}")


# --- Results Section ---
if st.session_state.gan_data is not None:
    with st.expander("Step 3: Results Analysis", expanded=True):
        st.subheader("Generated Dataset Preview")
        st.dataframe(st.session_state.gan_data.head())
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("### Original Data Statistics")
            st.write(st.session_state.generated_data.describe())
        with col2:
            st.markdown("### Custom-Generated Data Statistics")
            st.write(st.session_state.gan_data.describe())
        selected_column = st.selectbox("Select column for distribution comparison", options=st.session_state.gan_data.columns)
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("**Original Distribution**")
            st.bar_chart(st.session_state.generated_data[selected_column].value_counts())
        with col2:
            st.markdown("**Synthetic Distribution**")
            st.bar_chart(st.session_state.gan_data[selected_column].value_counts())
        st.download_button(label="Download Synthetic Dataset", data=st.session_state.gan_data.to_csv(index=False).encode('utf-8'), file_name='synthetic_data.csv', mime='text/csv')

# --- Sidebar Information ---
with st.sidebar:
    st.header("📋 Information")
    st.markdown("""
    ### Features
    - Large Concept Model powered data generation (if using prompt)
    - Multi-model synthetic data generation (Deep Learning Models)
    - Custom constraints and real-time distribution analysis
    - Simplified, natural language data transformation for uploaded datasets
    - Testing and rollback support for transformations
    """)
