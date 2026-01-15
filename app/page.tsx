import fs from "fs";
import path from "path";
import Script from "next/script";

export default function HomePage() {
  const filePath = path.join(process.cwd(), "public", "home", "index.html");
  let bodyHtml = "";
  try {
    const html = fs.readFileSync(filePath, "utf8");
    const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    bodyHtml = m ? m[1] : html;
    // remove any script tags inside the body (we'll load scripts via next/script)
    bodyHtml = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, "");
    // Fix relative asset paths (make them absolute to /home/...)
    bodyHtml = bodyHtml.replace(/src=\"\.\/img\//g, 'src="/home/img/');
    bodyHtml = bodyHtml.replace(/src=\'\.\/img\//g, "src='/home/img/");
    bodyHtml = bodyHtml.replace(/src=\"\.\/js\//g, 'src="/home/js/');
    bodyHtml = bodyHtml.replace(/src=\'\.\/js\//g, "src='/home/js/");
    bodyHtml = bodyHtml.replace(/href=\"\.\/css\//g, 'href="/home/css/');
    bodyHtml = bodyHtml.replace(/href=\'\.\/css\//g, "href='/home/css/");
    // General fallback: convert other relative src/href that start with ./ to /home/
    bodyHtml = bodyHtml.replace(/src=\"\.\//g, 'src="/home/');
    bodyHtml = bodyHtml.replace(/src=\'\.\//g, "src='/home/");
    bodyHtml = bodyHtml.replace(/href=\"\.\//g, 'href="/home/');
    bodyHtml = bodyHtml.replace(/href=\'\.\//g, "href='/home/");
  } catch (err) {
    bodyHtml = `<main><h1>خطأ في تحميل الصفحة</h1><pre>${String(err)}</pre></main>`;
  }

  return (
    <>
      <div style={{ backgroundColor: "#fff", minHeight: "100vh" }} className="home-page-wrapper">
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>

      {/* Load JS needed by the original page in correct order */}
      {/* Load jQuery and Isotope before interactive so $ is available for app.js */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js" strategy="beforeInteractive" />
      <Script src="/home/js/isotope.pkgd.min.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/swiper/swiper-bundle.min.js" strategy="afterInteractive" />
      <Script src="/home/js/app.js" strategy="afterInteractive" />
    </>
  );
}
