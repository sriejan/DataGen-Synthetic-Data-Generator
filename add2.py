import argparse
import json
import os
import sys
import re
from io import StringIO
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sdv.single_table import (
    CTGANSynthesizer,
    TVAESynthesizer,
    CopulaGANSynthesizer,
)
from sdv.metadata import SingleTableMetadata

# Optional: Gemini, only used if configured
try:
    import google.generativeai as genai  # type: ignore
except Exception:  # pragma: no cover - optional
    genai = None  # type: ignore


def eprint(*args: Any, **kwargs: Any) -> None:
    print(*args, file=sys.stderr, **kwargs)


def ensure_uploads_dir() -> str:
    uploads_dir = os.path.join(os.getcwd(), 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    return uploads_dir


def infer_column_types(df: pd.DataFrame) -> Dict[str, str]:
    types: Dict[str, str] = {}
    for col in df.columns:
        series = df[col]
        if pd.api.types.is_bool_dtype(series):
            types[col] = 'boolean'
        elif pd.api.types.is_numeric_dtype(series):
            types[col] = 'numerical'
        elif pd.api.types.is_datetime64_any_dtype(series):
            types[col] = 'datetime'
        else:
            types[col] = 'categorical'
    return types


def dataset_from_df(df: pd.DataFrame, id_column: Optional[str] = None) -> Dict[str, Any]:
    column_types = infer_column_types(df)
    data_records: List[Dict[str, Any]] = []
    for _, row in df.iterrows():
        # Convert numpy types to native Python types for JSON serialization
        record: Dict[str, Any] = {}
        for k, v in row.items():
            if pd.isna(v):
                record[k] = None
            elif isinstance(v, (np.integer, np.floating)):
                record[k] = v.item()
            elif isinstance(v, (np.bool_,)):
                record[k] = bool(v)
            else:
                record[k] = v
        data_records.append(record)
    return {
        'data': data_records,
        'columns': list(df.columns),
        'columnTypes': column_types,
        'idColumn': id_column if id_column else None,
    }


def to_snake(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s)
    return s.strip('_')


def parse_prompt_columns(prompt: str) -> List[Dict[str, Any]]:
    # Parses bullet lines like: "- age (18-80)" or "- customer_segment (Basic, Premium, VIP)"
    fields: List[Dict[str, Any]] = []
    for line in prompt.splitlines():
        m = re.match(r"\s*[-*]\s*([a-zA-Z0-9_\s]+?)\s*\(([^\)]*)\)", line)
        if not m:
            continue
        raw_name = m.group(1).strip()
        meta = m.group(2).strip()
        name = to_snake(raw_name)
        # Identify range "min-max"
        range_match = re.match(r"\s*(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)\s*", meta)
        if range_match:
            lo = float(range_match.group(1))
            hi = float(range_match.group(2))
            is_int = lo.is_integer() and hi.is_integer()
            fields.append({'name': name, 'type': 'numerical', 'min': lo, 'max': hi, 'int': is_int})
            continue
        # Identify allowed values "A, B, C"
        values = [v.strip() for v in meta.split(',') if v.strip()]
        if values and all(re.match(r"^[a-zA-Z0-9_\- ]+$", v) for v in values):
            fields.append({'name': name, 'type': 'categorical', 'values': values})
            continue
        # Fallback to categorical
        fields.append({'name': name, 'type': 'categorical', 'values': []})
    return fields


def generate_offline_dataset(prompt: str, rows: int) -> pd.DataFrame:
    fields = parse_prompt_columns(prompt)
    if not fields:
        # Fallback generic dataset
        cols = ['col_a', 'col_b', 'col_c']
        data = {
            'col_a': np.random.randint(0, 100, size=rows),
            'col_b': np.random.choice(['A', 'B', 'C'], size=rows),
            'col_c': np.random.choice([True, False], size=rows),
        }
        return pd.DataFrame(data, columns=cols)
    out: Dict[str, Any] = {}
    for f in fields:
        if f['type'] == 'numerical':
            lo = f.get('min', 0)
            hi = f.get('max', 100)
            if f.get('int', True):
                out[f['name']] = np.random.randint(int(lo), int(hi) + 1, size=rows)
            else:
                out[f['name']] = np.random.uniform(lo, hi, size=rows)
        elif f['type'] == 'categorical':
            values = f.get('values') or ['A', 'B']
            out[f['name']] = np.random.choice(values, size=rows)
        else:
            out[f['name']] = np.random.choice([True, False], size=rows)
    return pd.DataFrame(out)


def try_init_gemini() -> Optional[Any]:  # Any to avoid strict import typing
    if genai is None:
        return None
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return None
    try:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel('gemini-1.5-flash')
    except Exception as ex:  # pragma: no cover - environment-specific
        eprint(f"Gemini init failed: {ex}")
        return None


def cmd_engineer_prompt(args: argparse.Namespace) -> int:
    with open(args.prompt, 'r', encoding='utf-8') as f:
        user_prompt = f.read()
    model = try_init_gemini()
    if model is None:
        # Offline fallback: return the original prompt
        print(user_prompt.strip())
        return 0
    try:
        resp = model.generate_content([
            "You are a prompt engineering expert for synthetic data generation. "
            "Design a complete prompt for a synthetic data generator including suggested column names, "
            "data types, realistic ranges, and correlations. Do not include row counts. \n"
            "Output only the engineered prompt, without any markdown backticks.",
            f"Dataset description: {user_prompt}",
        ])
        engineered = (resp.text or '').strip()
        print(engineered)
    except Exception as ex:
        eprint(f"Engineer prompt failed, returning original. Error: {ex}")
        print(user_prompt.strip())
    return 0


def cmd_generate_constraints(args: argparse.Namespace) -> int:
    with open(args.prompt, 'r', encoding='utf-8') as f:
        user_prompt = f.read()
    model = try_init_gemini()
    if model is None:
        # Offline naive extraction: build min/max if found
        constraints: Dict[str, Dict[str, Any]] = {}
        for fdef in parse_prompt_columns(user_prompt):
            if fdef['type'] == 'numerical':
                constraints[fdef['name']] = {
                    'min': fdef.get('min', 0),
                    'max': fdef.get('max', 100),
                }
        print(json.dumps(constraints))
        return 0
    try:
        resp = model.generate_content([
            "Given the dataset description, produce a JSON object of value constraints per field. "
            "For numeric fields include 'min' and 'max'. Output only raw JSON with no backticks.",
            f"Dataset description: {user_prompt}",
        ])
        text = (resp.text or '').strip()
        # Remove accidental backticks
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
        # Validate JSON
        try:
            json.loads(text)
        except Exception:
            text = '{}'  # Fallback
        print(text)
    except Exception as ex:
        eprint(f"Constraints generation failed: {ex}")
        print('{}')
    return 0


def cmd_generate(args: argparse.Namespace) -> int:
    with open(args.prompt, 'r', encoding='utf-8') as f:
        prompt_text = f.read()
    if args.use_engineering and prompt_text:
        # Try to engineer, but don't fail if unavailable
        try:
            model = try_init_gemini()
            if model is not None:
                resp = model.generate_content([
                    "You are a prompt engineering expert for synthetic data generation. "
                    "Design a complete prompt for a synthetic data generator including suggested column names, "
                    "data types, realistic ranges, and correlations. Do not include row counts. \n"
                    "Output only the engineered prompt, without any markdown backticks.",
                    f"Dataset description: {prompt_text}",
                ])
                prompt_text = (resp.text or '').strip()
        except Exception as ex:
            eprint(f"Prompt engineering skipped due to error: {ex}")

    model = try_init_gemini()
    df: pd.DataFrame
    if model is None:
        df = generate_offline_dataset(prompt_text, args.rows)
    else:
        # Ask Gemini to return CSV and parse it
        try:
            sys_prompt = (
                "You are a data generation expert. Generate realistic synthetic data as CSV only (with header), "
                "no extra text or backticks. No missing values."
            )
            user_prompt = (
                f"Generate {args.rows} rows of synthetic data based on this prompt:\n{prompt_text}\n"
            )
            resp = model.generate_content([sys_prompt, user_prompt])
            csv_text = (resp.text or '').strip()
            csv_text = re.sub(r"^```(?:csv)?", "", csv_text)
            csv_text = re.sub(r"```$", "", csv_text)
            df = pd.read_csv(StringIO(csv_text))
        except Exception as ex:
            eprint(f"Gemini CSV generation failed, using offline generator: {ex}")
            df = generate_offline_dataset(prompt_text, args.rows)

    dataset = dataset_from_df(df)
    print(json.dumps(dataset))
    return 0


def cmd_process_file(args: argparse.Namespace) -> int:
    path = args.file
    if not os.path.exists(path):
        eprint(f"File not found: {path}")
        print(json.dumps({"error": f"File not found: {path}"}))
        return 0
    try:
        if path.lower().endswith('.csv'):
            df = pd.read_csv(path)
        elif path.lower().endswith(('.xlsx', '.xls')):
            # Requires openpyxl for .xlsx
            df = pd.read_excel(path)
        else:
            print(json.dumps({"error": "Unsupported file type. Please upload CSV or Excel."}))
            return 0
        dataset = dataset_from_df(df)
        print(json.dumps(dataset))
    except Exception as ex:
        eprint(f"process-file failed: {ex}")
        print(json.dumps({"error": str(ex)}))
    return 0


def cmd_transform(args: argparse.Namespace) -> int:
    # Security-first: do NOT execute arbitrary code. Return dataset unchanged.
    try:
        with open(args.dataset, 'r', encoding='utf-8') as f:
            dataset = json.load(f)
        # Return as-is to satisfy contract safely
        print(json.dumps(dataset))
    except Exception as ex:
        eprint(f"transform failed: {ex}")
        print(json.dumps({"error": str(ex)}))
    return 0


def cmd_generate_transformation(args: argparse.Namespace) -> int:
    # Provide a no-op transformation; generation of arbitrary code is disabled by default.
    no_op_code = "df = df"
    print(no_op_code)
    return 0


def build_metadata_from_dataset(df: pd.DataFrame, dataset_meta: Dict[str, Any]) -> SingleTableMetadata:
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(df)
    column_types = dataset_meta.get('columnTypes', {})
    for col, ctype in column_types.items():
        try:
            metadata.update_column(col, sdtype=ctype, table_name='default')
        except Exception:
            # Ignore unknown columns/types gracefully
            pass
    id_col = dataset_meta.get('idColumn')
    if id_col and id_col in df.columns:
        try:
            if df[id_col].nunique() == len(df):
                metadata.update_column(id_col, sdtype='id', table_name='default')
        except Exception:
            pass
    return metadata


def compute_validation(original_df: pd.DataFrame, synth_df: pd.DataFrame, constraints: Dict[str, Any]) -> Dict[str, Any]:
    results: Dict[str, Any] = {}
    for col in original_df.columns:
        res: Dict[str, Any] = {
            'originalMean': None,
            'syntheticMean': None,
            'originalStd': None,
            'syntheticStd': None,
            'constraintViolations': 0,
        }
        if pd.api.types.is_numeric_dtype(original_df[col]):
            try:
                res['originalMean'] = float(np.nanmean(original_df[col]))
            except Exception:
                res['originalMean'] = None
            try:
                res['syntheticMean'] = float(np.nanmean(synth_df[col]))
            except Exception:
                res['syntheticMean'] = None
            try:
                res['originalStd'] = float(np.nanstd(original_df[col]))
            except Exception:
                res['originalStd'] = None
            try:
                res['syntheticStd'] = float(np.nanstd(synth_df[col]))
            except Exception:
                res['syntheticStd'] = None
        # Constraints
        col_constraints = constraints.get(col) or constraints.get(to_snake(col)) or {}
        try:
            if 'min' in col_constraints:
                res['constraintViolations'] += int((synth_df[col] < col_constraints['min']).sum())
            if 'max' in col_constraints:
                res['constraintViolations'] += int((synth_df[col] > col_constraints['max']).sum())
        except Exception:
            pass
        results[col] = res
    return results


def cmd_train_model(args: argparse.Namespace) -> int:
    try:
        with open(args.dataset, 'r', encoding='utf-8') as f:
            dataset_meta = json.load(f)
        with open(args.config, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Build DataFrame from dataset
        df = pd.DataFrame(dataset_meta['data'])
        # Ensure column order
        df = df[dataset_meta['columns']]

        # Build metadata for SDV
        metadata = build_metadata_from_dataset(df, dataset_meta)

        model_type = config['modelType']
        params = config.get('params', {})
        epochs = int(params.get('epochs', 500))
        batch_size = int(params.get('batchSize', 256))
        generator_dim = params.get('generatorDim', [256, 256])
        discriminator_dim = params.get('discriminatorDim', [256, 256])
        learning_rate = float(params.get('learningRate', 0.0005))
        pac = int(params.get('pac', 5))

        if model_type == 'CTGAN':
            synthesizer = CTGANSynthesizer(
                metadata,
                epochs=epochs,
                batch_size=batch_size,
                generator_dim=generator_dim,
                discriminator_dim=discriminator_dim,
                generator_lr=learning_rate,
                discriminator_lr=learning_rate,
                pac=pac,
            )
        elif model_type == 'TVAE':
            synthesizer = TVAESynthesizer(
                metadata,
                epochs=epochs,
                batch_size=batch_size,
            )
        elif model_type == 'CopulaGAN':
            synthesizer = CopulaGANSynthesizer(
                metadata,
                epochs=epochs,
                batch_size=batch_size,
                generator_dim=generator_dim,
                discriminator_dim=discriminator_dim,
                generator_lr=learning_rate,
                discriminator_lr=learning_rate,
                pac=pac,
            )
        else:
            print(json.dumps({"error": f"Unsupported modelType: {model_type}"}))
            return 0

        synthesizer.fit(df)
        # Sample same number of rows by default
        synth_rows = len(df)
        synth_df = synthesizer.sample(synth_rows)

        synthetic_dataset = dataset_from_df(synth_df, dataset_meta.get('idColumn'))
        constraints = config.get('constraints', {})
        validation = compute_validation(df, synth_df, constraints)

        # Persist for download route
        uploads_dir = ensure_uploads_dir()
        csv_path = os.path.join(uploads_dir, 'synthetic_data.csv')
        json_path = os.path.join(uploads_dir, 'synthetic_data.json')
        try:
            synth_df.to_csv(csv_path, index=False)
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(synthetic_dataset, f)
        except Exception as ex:
            eprint(f"Failed to persist synthetic data: {ex}")

        result = {
            'syntheticData': synthetic_dataset,
            'validationResults': validation,
        }
        print(json.dumps(result))
    except Exception as ex:
        eprint(f"train-model failed: {ex}")
        print(json.dumps({"error": str(ex)}))
    return 0


def cmd_download(args: argparse.Namespace) -> int:
    uploads_dir = ensure_uploads_dir()
    fmt = args.format.lower()
    if fmt == 'csv':
        path = os.path.join(uploads_dir, 'synthetic_data.csv')
    else:
        path = os.path.join(uploads_dir, 'synthetic_data.json')
    if not os.path.exists(path):
        print(json.dumps({"filePath": ""}))
        return 0
    print(json.dumps({"filePath": path}))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='Synthetic Data Generator CLI')
    sub = parser.add_subparsers(dest='command', required=True)

    p_gen = sub.add_parser('generate', help='Generate dataset from prompt')
    p_gen.add_argument('--prompt', required=True, help='Path to prompt text file')
    p_gen.add_argument('--rows', required=True, type=int, help='Number of rows')
    p_gen.add_argument('--use-engineering', required=False, default='false', help='true/false')
    p_gen.set_defaults(func=cmd_generate)

    p_eng = sub.add_parser('engineer-prompt', help='Engineer prompt text')
    p_eng.add_argument('--prompt', required=True, help='Path to prompt text file')
    p_eng.set_defaults(func=cmd_engineer_prompt)

    p_con = sub.add_parser('generate-constraints', help='Generate constraints JSON from prompt')
    p_con.add_argument('--prompt', required=True, help='Path to prompt text file')
    p_con.set_defaults(func=cmd_generate_constraints)

    p_proc = sub.add_parser('process-file', help='Process uploaded dataset file')
    p_proc.add_argument('--file', required=True, help='Path to CSV/XLSX file')
    p_proc.set_defaults(func=cmd_process_file)

    p_tf = sub.add_parser('transform', help='Safely return dataset unchanged (transform disabled)')
    p_tf.add_argument('--dataset', required=True, help='Path to dataset JSON')
    p_tf.add_argument('--code', required=True, help='Path to transformation code (ignored)')
    p_tf.set_defaults(func=cmd_transform)

    p_gt = sub.add_parser('generate-transformation', help='Generate (no-op) transformation code')
    p_gt.add_argument('--sample', required=True, help='Path to dataset sample JSON')
    p_gt.add_argument('--instructions', required=True, help='Path to instructions text')
    p_gt.set_defaults(func=cmd_generate_transformation)

    p_tm = sub.add_parser('train-model', help='Train model and generate synthetic data')
    p_tm.add_argument('--dataset', required=True, help='Path to dataset JSON')
    p_tm.add_argument('--config', required=True, help='Path to model config JSON')
    p_tm.set_defaults(func=cmd_train_model)

    p_dl = sub.add_parser('download', help='Prepare latest synthetic data for download')
    p_dl.add_argument('--format', required=True, choices=['csv', 'json'], help='Download format')
    p_dl.set_defaults(func=cmd_download)

    args = parser.parse_args()
    # Normalize boolean flag
    if hasattr(args, 'use_engineering'):
        val = str(args.use_engineering).lower()
        args.use_engineering = val in ('1', 'true', 'yes', 'y')
    return args.func(args)


if __name__ == '__main__':
    sys.exit(main())

