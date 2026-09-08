# Context Glossary

This file captures domain vocabulary only. It is not a feature spec or implementation plan.

## Handwritten Note

The raw note created by writing on the tablet display with a stylus, touch, or mouse. In the first prototype this is captured on an HTML Canvas.

## Raw Note

The unprocessed content captured from the user before any AI interpretation.

## Internal Document Entry

The structured text output created from a raw note for internal further processing. It is not initially customer-facing and is not an invoice, offer, or official report.

## Interpretation

The process that turns a handwritten/raw note into an internal document entry. In the first prototype this is mocked; later it may use OCR, a multimodal LLM, or a combination of both.

## Provider

The user's chosen AI service, such as OpenAI, Anthropic, Gemini, or a local model provider. Provider login and real API calls are out of scope for the first prototype.

## Manual Send

The user-controlled action that starts interpretation. Notes should remain local until the user explicitly triggers this action.
