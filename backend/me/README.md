# Personal Portfolio Configuration

This folder contains your personal portfolio/resume information used by the LinkedIn Analyser for the **Personal Profile** feature.

## 📄 portfolio.txt

The `portfolio.txt` file contains your complete professional profile that is used when you select **"Use Personal Profile"** instead of uploading a resume.

### Usage

When analyzing jobs:
1. Check **"Use Personal Profile (portfolio.txt)"** in the extension
2. Click **"Analyze Resume Match"**
3. The system will use your `portfolio.txt` for skill matching

### Format

The file is in plain text format with sections for:

| Section | Description |
|---------|-------------|
| **Personal Information** | Name, role, contact details |
| **Professional Summary** | Brief overview of experience |
| **Work Experience** | Job history with achievements |
| **Technical Skills** | Skills organized by category |
| **Projects** | Personal and professional projects |
| **Education** | Academic background |
| **Certifications** | Training and certifications |

### Updating Your Profile

Edit `portfolio.txt` to update your:
- Skills and technologies
- Work experience
- Projects and achievements
- Certifications

The backend server will automatically use the latest version of this file when analyzing jobs.

---

## Example Template

```txt
👤 Personal Information

Full Name: John Doe
Role: Full Stack Developer
Total Experience: 5 Years
Email: john.doe@example.com
Location: San Francisco, CA

🧠 Professional Summary

Experienced developer specializing in web applications...

💼 Work Experience

Company Name, Location
Job Title | Start – End
- Achievement 1
- Achievement 2

🛠️ Technical Skills

Backend: Node.js, Python, Java
Frontend: React, Vue.js, Angular
Databases: PostgreSQL, MongoDB, Redis
Cloud: AWS, GCP, Azure

🚀 Projects

Project Name
- Description
- Technologies used
- Link: https://example.com

🎓 Education

University Name
Degree | Year
```

---

Update `portfolio.txt` with your actual information following this structure.
