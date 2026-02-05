const fs = require("fs");

function printTxtFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    console.log(data);
  } catch (err) {
    console.error("Error reading file:", err);
  }
}

// Example usage
// printTxtFile("backend/me/portfolio.txt");



let a=`👤 Personal Information

Full Name: Mani Kumar Punna

Role: Node.js Backend Developer | MERN Stack Developer | Agentic AI Developer

Total Experience: 3.7 Years

Email: punnamanikumar@gmail.com

LinkedIn: https://linkedin.com/in/punnamanikumar

GitHub: https://github.com/punnamanikumar

Location: India

Availability: Open to opportunities

Primary Focus: Backend Development & Scalable Systems

🧠 Professional Summary

Mani Kumar Punna is a Node.js Backend Developer and Agentic AI Developer with 3.6 years of experience in building scalable, secure, and high-performance backend systems. He specializes in REST APIs, authentication systems, Redis caching, microservices, and AWS cloud services. He has expertise in Agentic AI development, Retrieval-Augmented Generation (RAG) systems, AI agent workflows, and integrating LLMs into production applications. He has experience modernizing legacy systems, improving performance, and delivering production-ready solutions used by multiple applications.

💼 Work Experience
Datamatics, Bengaluru

Node.js Backend Developer | June 2022 – Present

Designed and implemented a centralized authentication service (login, JWT, RBAC, CBAC) with LDAP integration, converting legacy code into a reusable plug-and-play module

Reduced integration effort by ~80%, adopted by 3 production applications, including the main enterprise system

Migrated session management to Redis, reducing database load by 60% and improving API response time by 30%

Enhanced API security by encrypting JWT payloads and optimizing token generation

Implemented client version enforcement using User-Agent headers to ensure backward compatibility

Built AWS Lambda functions with VPC integration and AWS Secrets Manager for secure database automation

Developed Credential-Based Access Control (CBAC) for fine-grained, endpoint-level API access

Built a push notification microservice using AWS SNS + Redis caching

Fixed 100+ SonarQube issues, significantly improving code quality and maintainability

🛠️ Technical Skills
Backend

Node.js, Express.js, Nest.js

REST APIs

api design

express.js

kafka

TypeScript, JavaScript

Redis, LDAP

AI & Machine Learning

Agentic AI Development

Retrieval-Augmented Generation (RAG)

LangChain, LangGraph

OpenAI API, LLM Integration

Vector Databases

AI Agent Workflows

Prompt Engineering

Frontend

React.js

HTML, CSS, JavaScript

Databases

MongoDB

MySQL

Oracle

Cloud & DevOps

AWS (Lambda, S3, SNS, SQS, EventBridge, CDK)

Docker

Git

Monitoring & Quality

Grafana

Dynatrace

SonarQube

Checkmarx

Testing

Jest

Tools & Collaboration

GitHub, GitLab

Jira, Agile, Slack

Postman, VS Code

GitHub Copilot

🚀 Projects
React Blog Application

Full-stack blog application using React, Node.js, Express, MongoDB

Features dynamic routing, secure APIs, and CRUD operations

Links:

Live Demo: https://manikumar-react-blog-complete.netlify.app/

Todo UI Mobile & Web App

This project showcases the capabilities of HTML and CSS by creating styled static applications with separate HTML and CSS files

Links:

Todo UI URL: https://punnamanikumar.github.io/TodoList-JS/

Digital Clock

This Project contains functions required for DOM manipulation. Also added dynamic HTML using JS and Date function of JS

Links:

DigitalClock URL: https://punnamanikumar.github.io/DigitalClock-UI/

Portfolio Website

Responsive personal portfolio built with React and Node.js

Deployed on Netlify (frontend) and Render (backend)

Live Site: https://manikumarportfolio.netlify.app/

Online Attendance Management System (Academic)

Role-based system (Admin / Faculty / Student)

Built using PHP and MySQL

🔹 For more projects, please refer to my GitHub profile and portfolio website:

GitHub: https://github.com/punnamanikumar

Portfolio: https://manikumarportfolio.netlify.app/

🔹 You can add GitHub & Live Demo links anytime — the structure is already chatbot-ready.

🎓 Education

Sphoorthy Engineering College, Hyderabad
B.Tech in Computer Science & Engineering
2017 – 2021 | CGPA: 7.17

NRI Junior College, Hyderabad
Intermediate (MPC)
2015 – 2017 | Grade: 77%

🏆 Awards & Recognition

Annual Achiever Award – Datamatics

Spot Award – Datamatics

🥉 3rd Prize – J-HUB (JNTUH) Hackathon League

Project: Portal for Farmers

📜 Training & Certifications

PrepBytes – Training & Internship (Remote)

6-month MERN stack training + 3-month internship

Worked on team and individual full-stack projects

Salesforce Developer Training – ICT Academy

5 Super Badges

59 Developer Module Badges

Trailblazer Profile (link can be added)

Additional Courses:

Python Programming

AWS Fundamentals

🤖 AI & Agentic AI Development

Experienced in Agentic AI Development and RAG systems

Built production-ready AI agents with multi-step reasoning capabilities

Implemented Retrieval-Augmented Generation (RAG) pipelines for knowledge-based applications

Developed AI agent workflows using LangChain and LangGraph

Integrated LLMs (OpenAI, Claude) into backend systems

Actively used ChatGPT and GitHub Copilot

Reduced manual coding effort by 40–50%

Used AI for:

Code suggestions

Refactoring

Test case generation

Faster debugging

AI agent development

RAG system optimization

🌐 Languages

English – Fluent

Telugu – Native

Hindi – Intermediate`


console.log(a.length)


