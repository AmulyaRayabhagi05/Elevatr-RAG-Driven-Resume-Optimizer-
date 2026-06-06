# Job Scraper: Setup & Usage Guide

##  Getting Started

### 1. Save the Script
The python script is called `job_search.py`.

### 2. Open Your Terminal
Open your Command Prompt, PowerShell, or Terminal and navigate to the folder where you saved the file:
```bash
cd backend
python job_search.py "Data Scientist"
```
| Flag   | Full Argument | Description | Example |
| :--- | :--- | :--- | :--- |
| (None) | `title` | **Required.** The job title keywords. | `"Data Scientist"` |
| `-l` | `--location` | City, State or "Remote". | `-l "New York, NY"` |
| `-t` | `--type` | Employment category. | `-t full-time` |
| `-c` | `--company` | Search only a specific company. | `-c "Stripe"` |
| `-s` | `--skills` | Words that **must** be in the job. | `-s react node` |
| (None) | `--sort` | Ranking priority: `recent`, `relevant`, or `recent+relevant` (default). | `--sort recent` |
| `--save` | `--save` | Exports results to a file. | `--save results.csv` |
