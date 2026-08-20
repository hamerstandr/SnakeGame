<?php
/**
 * Snake Game - PHP Server for XAMPP
 * این فایل برای اجرای بازی مار در محیط XAMPP طراحی شده است
 * 
 * نحوه استفاده:
 * 1. پوشه dist را در htdocs/xampp کپی کنید
 * 2. این فایل را نیز در همان پوشه قرار دهید
 * 3. مرورگر را باز کرده و به آدرس http://localhost/snake-game/index.php بروید
 */

// تنظیمات اولیه
header('Content-Type: text/html; charset=utf-8');
header('X-UA-Compatible: IE=edge');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// مسیر فایل‌های استاتیک
$baseDir = __DIR__;
$assetsDir = $baseDir . '/assets';

// بررسی وجود فایل‌ها
if (!file_exists($baseDir . '/index.html')) {
    die('خطا: فایل index.html یافت نشد. لطفاً ابتدا پروژه را build کنید.');
}

if (!is_dir($assetsDir)) {
    die('خطا: پوشه assets یافت نشد. لطفاً ابتدا پروژه را build کنید.');
}

// دریافت لیست فایل‌های JS و CSS
$jsFiles = glob($assetsDir . '/*.js');
$cssFiles = glob($assetsDir . '/*.css');

// خواندن محتوای HTML اصلی
$htmlContent = file_get_contents($baseDir . '/index.html');

// اصلاح مسیر فایل‌های استاتیک برای کار با PHP
$htmlContent = preg_replace(
    '|href="/assets/([^"]+)"|',
    'href="assets/$1"',
    $htmlContent
);
$htmlContent = preg_replace(
    '|src="/assets/([^"]+)"|',
    'src="assets/$1"',
    $htmlContent
);

?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#06110d" />
    <meta name="description" content="بازی کلاسیک مار با حس و حال جنگل شب‌تاب — کنترل لمسی و کیبورد، چهار سطح دشواری و ذخیره‌ی رکورد" />
    <title>مارِ شب‌تاب | بازی مار</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a1c15'/%3E%3Cpath d='M8 22q0-8 8-8t8-6' stroke='%23bef264' stroke-width='4' stroke-linecap='round' fill='none'/%3E%3Ccircle cx='24' cy='8' r='2.4' fill='%23fde68a'/%3E%3C/svg%3E" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Lalezar&family=Vazirmatn:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
    
    <?php foreach ($cssFiles as $cssFile): ?>
    <link rel="stylesheet" href="assets/<?php echo basename($cssFile); ?>">
    <?php endforeach; ?>
    
    <style>
        /* استایل‌های اضافی برای سرور PHP */
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        #root {
            width: 100vw;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <?php foreach ($jsFiles as $jsFile): ?>
    <script type="module" src="assets/<?php echo basename($jsFile); ?>"></script>
    <?php endforeach; ?>
    
    <script>
        // بررسی پشتیبانی مرورگر
        if (!window.Promise) {
            document.getElementById('root').innerHTML = '<div style="color: white; font-family: Vazirmatn; text-align: center; padding: 50px;">مرورگر شما قدیمی است. لطفاً از مرورگر مدرن استفاده کنید.</div>';
        }
        
        // ثبت Service Worker (اختیاری)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                // navigator.serviceWorker.register('/sw.js');
            });
        }
    </script>
</body>
</html>
