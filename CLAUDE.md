# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a web-based SMS application for macOS that integrates with the Messages app using AppleScript to send bulk SMS messages. The application is built with Flask backend and vanilla JavaScript frontend.

## Development Commands

### Quick Start
```bash
./run.sh
```
This script handles virtual environment setup, dependency installation, and starts the development server on http://127.0.0.1:5001

### Manual Development Setup
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python3 app.py
```

### Testing the Application
```bash
# Start Messages app (required for SMS functionality)
open -a Messages

# Test the web interface at http://127.0.0.1:5001
```

## Architecture

### Core Components

- **app.py**: Main Flask application (single file architecture)
  - Contact management (CRUD operations with JSON file storage)
  - CSV import functionality with validation
  - AppleScript integration for SMS sending via Messages app
  - Security middleware (CORS, file upload validation, XSS prevention)

- **AppleScript Integration**: 
  - `send_message_via_applescript()` at app.py:106 - Core SMS sending function
  - Requires macOS Messages app to be running
  - Uses subprocess to execute AppleScript commands

### Frontend Architecture

- **templates/index.html**: Single-page application with Bootstrap UI
- **static/js/app.js**: JavaScript class-based architecture
  - `SMSApp` class manages the entire application state
  - Contact management, file uploads, and SMS sending
  - Modal-based UI interactions

### Data Storage

- **contacts.json**: Local JSON file for contact persistence
- No external database dependency
- Contact structure: `{id, name, phone}`

### Security Features

- CORS restricted to localhost origins only
- File upload validation (CSV only, 10MB limit)
- XSS prevention with input sanitization
- No external data transmission (all local)

## Key Functions

- `send_message_via_applescript()` (app.py:106): Core SMS functionality
- `load_contacts()`/`save_contacts()`: JSON file persistence
- `parse_csv_file()`: CSV import with duplicate detection
- Contact CRUD: `/api/contacts` endpoints

## Development Notes

- macOS only (AppleScript dependency)
- Messages app must be running for SMS functionality
- Development server runs on port 5001 (security hardcoded)
- Virtual environment managed by run.sh script
- Logging configured with rotating file handler