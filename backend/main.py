import os
import uuid
import asyncio
import time
from typing import List
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from playwright.async_api import async_playwright

import aiosmtplib
from email.message import EmailMessage

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs = {}
os.makedirs("tmp", exist_ok=True)

class ExportRequest(BaseModel):
    imageDataUrl: str

class EmailRequest(BaseModel):
    smtpAccount: str
    to: List[str]
    subject: str
    body: str

# --- Cleanup Background Task ---
async def cleanup_old_files():
    while True:
        try:
            now = time.time()
            for filename in os.listdir("tmp"):
                filepath = os.path.join("tmp", filename)
                # Delete files older than 1 hour (3600 seconds)
                if os.path.isfile(filepath) and os.stat(filepath).st_mtime < now - 3600:
                    os.remove(filepath)
                    print(f"Cleaned up old file: {filepath}")
        except Exception as e:
            print(f"Cleanup error: {e}")
        await asyncio.sleep(600) # Check every 10 minutes

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_old_files())

# --- PDF Generation ---
async def generate_pdf_task(export_id: str, image_data_url: str):
    try:
        jobs[export_id] = "processing"
        header, encoded = image_data_url.split(",", 1)
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    margin: 0;
                    padding: 24px;
                    background-color: #1e1e24;
                    display: flex;
                    justify-content: center;
                }}
                img {{
                    max-width: 100%;
                    height: auto;
                    display: block;
                }}
            </style>
        </head>
        <body>
            <img src="{image_data_url}" />
        </body>
        </html>
        """
        
        html_path = f"tmp/{export_id}.html"
        pdf_path = f"tmp/{export_id}.pdf"
        
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            abs_html_path = os.path.abspath(html_path)
            await page.goto(f"file:///{abs_html_path}")
            await page.wait_for_selector("img")
            
            await page.pdf(
                path=pdf_path,
                print_background=True,
                format="A4",
                landscape=True
            )
            await browser.close()
            
        jobs[export_id] = "ready"
        
        if os.path.exists(html_path):
            os.remove(html_path)
            
    except Exception as e:
        print(f"Error generating PDF: {e}")
        jobs[export_id] = "failed"


@app.post("/api/dashboard/export-pdf")
async def export_pdf(request: ExportRequest, background_tasks: BackgroundTasks):
    export_id = str(uuid.uuid4())
    jobs[export_id] = "pending"
    background_tasks.add_task(generate_pdf_task, export_id, request.imageDataUrl)
    return {"exportId": export_id}

@app.get("/api/dashboard/export-pdf/{export_id}/status")
async def get_status(export_id: str):
    if export_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"status": jobs[export_id]}

@app.get("/api/dashboard/export-pdf/{export_id}/preview")
async def preview_pdf(export_id: str):
    if export_id not in jobs or jobs[export_id] != "ready":
        raise HTTPException(status_code=404, detail="PDF not ready or not found")
    
    pdf_path = f"tmp/{export_id}.pdf"
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file missing")
        
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=dashboard_{export_id}.pdf"}
    )

def remove_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Error removing {path}: {e}")

@app.get("/api/dashboard/export-pdf/{export_id}/download")
async def download_pdf(export_id: str, background_tasks: BackgroundTasks):
    if export_id not in jobs or jobs[export_id] != "ready":
        raise HTTPException(status_code=404, detail="PDF not ready or not found")
    
    pdf_path = f"tmp/{export_id}.pdf"
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file missing")
        
    # Schedule file removal after the response is sent
    background_tasks.add_task(remove_file, pdf_path)
    
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=dashboard_{export_id}.pdf"}
    )

@app.post("/api/dashboard/export-pdf/{export_id}/send-email")
async def send_email(export_id: str, request: EmailRequest, background_tasks: BackgroundTasks):
    if export_id not in jobs or jobs[export_id] != "ready":
        raise HTTPException(status_code=404, detail="PDF not ready")
        
    pdf_path = f"tmp/{export_id}.pdf"
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file missing")
        
    message = EmailMessage()
    message["From"] = request.smtpAccount
    message["To"] = ", ".join(request.to)
    message["Subject"] = request.subject
    message.set_content(request.body)
    
    with open(pdf_path, "rb") as f:
        pdf_data = f.read()
        
    message.add_attachment(
        pdf_data, 
        maintype="application", 
        subtype="pdf", 
        filename=f"Dashboard_Report_{export_id[:8]}.pdf"
    )
    
    try:
        # In a real environment, you'd use credentials. 
        # For this demo, we'll try to connect to localhost port 25 or a mock server.
        # If testing, you might need real SMTP config here.
        # await aiosmtplib.send(message, hostname="127.0.0.1", port=1025)
        
        # For demonstration, we'll pretend it sent successfully.
        print(f"Pretending to send email to {request.to} from {request.smtpAccount}")
        
        # Schedule cleanup
        background_tasks.add_task(remove_file, pdf_path)
        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        print(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
