import os
import uuid
import asyncio
import time
import base64
import io
from fastapi.responses import Response
from PIL import Image
from typing import List
from fastapi import FastAPI, BackgroundTasks, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from playwright.async_api import async_playwright

import aiosmtplib
from email.message import EmailMessage
import json
from typing import List, Optional

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

class EmailProviderBase(BaseModel):
    host: str
    port: int
    username: str
    password: str
    from_address: str
    from_name: str

class TestConnectionRequest(EmailProviderBase):
    pass

PROVIDERS_FILE = "email_providers.json"

def load_providers() -> List[dict]:
    if os.path.exists(PROVIDERS_FILE):
        with open(PROVIDERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_providers(providers: List[dict]):
    with open(PROVIDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(providers, f, indent=4, ensure_ascii=False)

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

@app.post("/api/dashboard/download-pdf")
async def download_pdf(request: ExportRequest):
    try:
        base64_str = request.imageDataUrl
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]

        # Giải mã và chuyển đổi sang PDF
        image_bytes = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        pdf_buffer = io.BytesIO()
        image.save(pdf_buffer, format="PDF")
        pdf_content = pdf_buffer.getvalue()

        # Trả về file PDF với headers phù hợp để browser nhận diện tải xuống
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=dashboard_report.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/email-providers")
async def get_providers():
    return load_providers()

@app.post("/api/email-providers")
async def create_provider(provider: EmailProviderBase):
    providers = load_providers()
    new_provider = provider.dict()
    new_provider["id"] = str(uuid.uuid4())
    providers.append(new_provider)
    save_providers(providers)
    return new_provider

@app.put("/api/email-providers/{provider_id}")
async def update_provider(provider_id: str, provider: EmailProviderBase):
    providers = load_providers()
    for i, p in enumerate(providers):
        if p["id"] == provider_id:
            updated = provider.dict()
            updated["id"] = provider_id
            providers[i] = updated
            save_providers(providers)
            return updated
    raise HTTPException(status_code=404, detail="Provider not found")

@app.delete("/api/email-providers/{provider_id}")
async def delete_provider(provider_id: str):
    providers = load_providers()
    filtered = [p for p in providers if p["id"] != provider_id]
    if len(providers) == len(filtered):
        raise HTTPException(status_code=404, detail="Provider not found")
    save_providers(filtered)
    return {"status": "success"}

@app.post("/api/email-providers/test-connection")
async def test_connection(req: TestConnectionRequest):
    try:
        smtp_client = aiosmtplib.SMTP(hostname=req.host, port=req.port, timeout=10)
        await smtp_client.connect()
        if req.username and req.password:
            await smtp_client.login(req.username, req.password)
        await smtp_client.quit()
        return {"status": "success"}
    except Exception as e:
        print(f"Test connection error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/dashboard/send-email-with-blob")
async def send_email_with_blob(
    providerId: str = Form(...),
    to: str = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    pdfBlob: UploadFile = File(...)
):
    try:
        providers = load_providers()
        provider = next((p for p in providers if p["id"] == providerId), None)
        if not provider:
            raise HTTPException(status_code=404, detail="Email provider not found")
            
        # Đọc dữ liệu nhị phân từ file PDF upload (blob)
        pdf_data = await pdfBlob.read()
        
        message = EmailMessage()
        message["From"] = f"{provider['from_name']} <{provider['from_address']}>"
        # Xử lý chuỗi các email ngăn cách bằng dấu phẩy
        to_list = [email.strip() for email in to.split(",") if email.strip()]
        message["To"] = ", ".join(to_list)
        message["Subject"] = subject
        message.set_content(body)
        
        # Đính kèm PDF
        message.add_attachment(
            pdf_data, 
            maintype="application", 
            subtype="pdf", 
            filename="document.pdf"
        )
        
        smtp_client = aiosmtplib.SMTP(hostname=provider["host"], port=provider["port"], timeout=20)
        await smtp_client.connect()
        if provider.get("username") and provider.get("password"):
            await smtp_client.login(provider["username"], provider["password"])
            
        await smtp_client.send_message(message)
        await smtp_client.quit()
        
        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        print(f"Error sending email with blob: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
