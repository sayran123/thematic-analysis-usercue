# Thematic Analysis Pipeline

A comprehensive LangGraph-powered pipeline for automated thematic analysis of qualitative research data.

## Overview

This pipeline processes interview data from Excel files, generates themes using advanced language models, classifies responses, extracts supporting quotes with hallucination prevention, and produces comprehensive analysis reports.

## Architecture

The system implements a sophisticated 4-stage pipeline per question with parallel processing:

1. **Theme Generation + Question Identification** - LLM derives research questions and generates 3-5 themes
2. **Response Classification** - LLM classifies participant responses to themes
3. **Quote Extraction + Validation** - LLM extracts quotes with rigorous verification to prevent hallucination
4. **Summary Generation** - LLM creates engaging headlines and insights

All 6 questions are processed in parallel using LangGraph state management.

## Key Features

- **Hallucination Prevention**: Critical quote validation ensures all extracted quotes exist verbatim in source data
- **Dynamic Excel Parsing**: Automatically detects questions from column headers
- **Parallel Processing**: 6 questions analyzed simultaneously for efficiency
- **Comprehensive Validation**: Multi-stage validation for themes, quotes, and classifications
- **Rich Output Formats**: JSON results, Excel classification files, and Markdown executive summaries

## Project Structure

```
src/
├── data/
│   ├── extractors/         # Excel parsing and data extraction
│   ├── parsers/            # Response cleaning and structuring
│   └── models/             # TypeScript-style data models
├── analysis/
│   ├── agents/             # LLM agents for each analysis stage
│   ├── workflows/          # LangGraph state management
│   └── prompts/            # Prompt templates and formatting
├── outputs/
│   ├── generators/         # Output file generators
│   └── templates/          # Output structure templates
├── utils/
│   ├── config/             # Configuration and LLM setup
│   ├── helpers/            # Utility functions
│   └── validation/         # Critical validation modules
└── main.js                 # Entry point orchestrator

inputs/                     # Input data directory
outputs/                    # Generated analysis results
```

## Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

3. **Required environment variables:**
   - `OPENAI_API_KEY` - Required for LLM operations
   - `LANGSMITH_API_KEY` - Optional for monitoring

## Usage

### Basic Usage

1. **Place your data files:**
   - `inputs/data.xlsx` - Interview data with participant responses
   - `inputs/project_background.txt` - Project context for LLM

2. **Run the analysis:**
   ```bash
   npm start
   ```

3. **Review outputs:**
   - `outputs/thematic_analysis_results.json` - Complete analysis results
   - `outputs/executive_summary.md` - Stakeholder-friendly summary
   - `outputs/[questionId]_classifications.xlsx` - Classification inspection files

### Advanced Usage

```javascript
import { ThematicAnalysisPipeline } from './src/main.js';

const pipeline = new ThematicAnalysisPipeline({
  inputExcelPath: 'custom/path/data.xlsx',
  backgroundPath: 'custom/background.txt',
  outputDir: 'custom/outputs',
  enableLangSmith: true
});

const results = await pipeline.run();
```

## Input Data Format

### Excel File Structure
- **Column A**: Participant IDs
- **Columns B+**: Question data with headers as question identifiers
- **Cell Content**: Conversation format with `assistant:` and `user:` markers

### Example:
```
| participant_id | vpn_selection | privacy_concerns |
|----------------|---------------|------------------|
| 4434           | assistant: What factors... user: not in US or EU... | assistant: Any concerns... user: data collection worries me... |
```

## Output Files

### 1. Main Results (`thematic_analysis_results.json`)
Complete analysis with themes, classifications, quotes, and metadata.

### 2. Executive Summary (`executive_summary.md`)
Stakeholder-friendly markdown report with key insights and recommendations.

### 3. Classification Files (`[questionId]_classifications.xlsx`)
Excel files for inspecting and validating response classifications.

## Quality Assurance

### Quote Validation (Critical)
- **Verbatim Verification**: Every quote is validated against source conversations
- **Hallucination Prevention**: Automatic retry logic for failed validations
- **User Response Isolation**: Only extracts from participant responses, not assistant prompts

### Theme Validation
- **Generic Detection**: Identifies and flags overly generic themes
- **Coverage Analysis**: Ensures balanced theme distribution
- **Quality Scoring**: Quantitative assessment of theme quality

### Classification Validation
- **Complete Coverage**: Ensures all responses are classified
- **Distribution Balance**: Prevents single theme dominance
- **Confidence Tracking**: Monitors classification certainty

## Configuration

### Core Settings (`src/utils/config/constants.js`)
```javascript
ANALYSIS_CONFIG: {
  THEMES: { MIN_COUNT: 3, MAX_COUNT: 5 },
  QUOTES: { MAX_PER_THEME: 3, MAX_PER_PARTICIPANT_PER_THEME: 1 },
  VALIDATION: { QUOTE_RETRY_ATTEMPTS: 3 }
}
```

### LLM Configuration (`src/utils/config/llm-config.js`)
- Model selection and parameters
- Retry logic and timeout settings
- LangSmith monitoring integration

## Development

### File Structure Guidelines

Each file includes:
1. **TODO comment** describing its purpose
2. **Basic exports/imports structure**
3. **No implementation** - just scaffolding with error throws
4. **Comprehensive JSDoc** for all functions

### Key Implementation Notes

- **Quote Validator**: Most critical module - prevents LLM hallucination
- **Parallel Orchestrator**: Manages concurrent question processing
- **State Management**: LangGraph handles sequential stages per question
- **Error Handling**: Graceful degradation with detailed error reporting

## Troubleshooting

### Common Issues

1. **"LLM not implemented yet"** - Expected for scaffolding files
2. **API Key errors** - Check `.env` configuration
3. **File not found** - Verify input file paths
4. **Quote validation failures** - Check conversation format markers

### Debug Mode
```bash
DEBUG_MODE=true npm start
```

## Contributing

1. Maintain TODO-driven development approach
2. Implement comprehensive error handling
3. Add validation for all data transformations
4. Update documentation for any API changes

## License

MIT License - See LICENSE file for details.
