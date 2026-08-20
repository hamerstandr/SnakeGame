<?php
/**
 * Snake Game - Simple PHP Entry Point for XAMPP
 * 
 * این فایل ساده‌ترین روش برای اجرای بازی در XAMPP است
 * فقط کافیست این فایل را در پوشه پروژه کپی کرده و اجرا کنید
 */

// هدربهایی برای بهینه‌سازی
header('Content-Type: text/html; charset=utf-8');
header('X-UA-Compatible: IE=edge');

// مسیر فایل اصلی HTML
$htmlFile = __DIR__ . '/index.html';

if (!file_exists($htmlFile)) {
    http_response_code(404);
    die('<h1 style="color: red; font-family: Tahoma;">خطا: فایل index.html یافت نشد!</h1>');
}

// خواندن و نمایش فایل HTML
readfile($htmlFile);
