import fs from "fs";
import path from "path";
import Script from "next/script";

// Server-side function to read tutorials data
function getTutorialsData() {
  const tutorialsFile = path.join(process.cwd(), "data", "tutorials.json");
  try {
    if (fs.existsSync(tutorialsFile)) {
      const data = fs.readFileSync(tutorialsFile, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading tutorials:", err);
  }
  return null;
}

export default function HomePage() {
  const filePath = path.join(process.cwd(), "public", "home", "index.html");
  let bodyHtml = "";
  // Get tutorials data server-side
  const tutorialsData = getTutorialsData();
  
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

      {/* Add showTab function for video tutorials */}
      <Script id="showTab-script" strategy="afterInteractive">
        {`
          window.showTab = function(tab) {
            // Hide all content divs
            document.getElementById('student-content').style.display = 'none';
            document.getElementById('teacher-content').style.display = 'none';
            document.getElementById('all-content').style.display = 'none';
            
            // Show the selected content div
            document.getElementById(tab + '-content').style.display = 'block';
          };
        `}
      </Script>

      {/* Fetch and update tutorial videos and texts dynamically */}
      <Script id="tutorials-update" strategy="afterInteractive">
        {`
          (function() {
            fetch('/api/tutorials')
              .then(function(res) { return res.json(); })
              .then(function(data) {
                if (data.ok && data.tutorials) {
                  var tutorials = data.tutorials;
                  
                  // Update student video
                  if (tutorials.student && tutorials.student.video) {
                    var studentVideo = document.querySelector('#student-content video source');
                    if (studentVideo) {
                      studentVideo.src = '/home/video/' + tutorials.student.video;
                      var studentParent = studentVideo.parentElement;
                      studentParent.load();
                    }
                  }
                  
                  // Update student title
                  if (tutorials.student && tutorials.student.title) {
                    var studentTitle = document.querySelector('#student-detail h3');
                    if (studentTitle) {
                      studentTitle.textContent = tutorials.student.title;
                    }
                  }
                  
                  // Update student steps
                  if (tutorials.student && tutorials.student.steps && tutorials.student.steps.length > 0) {
                    var studentDetail = document.getElementById('student-detail');
                    if (studentDetail) {
                      // Remove old steps (keep first h3 and last tips div)
                      var oldSteps = studentDetail.querySelectorAll('div[style*="border-right: 4px solid var(--main-color)"]');
                      oldSteps.forEach(function(step) {
                        if (step.parentElement === studentDetail) {
                          step.remove();
                        }
                      });
                      
                      // Add new steps
                      var tipsDiv = studentDetail.querySelector('div[style*="#f8f9fa"]');
                      tutorials.student.steps.forEach(function(step) {
                        var stepDiv = document.createElement('div');
                        stepDiv.style.cssText = 'margin: 1.5rem 0; padding: 1rem; background: white; border-right: 4px solid var(--main-color); border-radius: 4px;';
                        stepDiv.innerHTML = '<h4 style="color: var(--main-color); margin-bottom: 0.8rem;">' + (step.title || '') + '</h4><p style="line-height: 1.6; color: #666;">' + (step.content || '') + '</p>';
                        if (tipsDiv) {
                          studentDetail.insertBefore(stepDiv, tipsDiv);
                        } else {
                          studentDetail.appendChild(stepDiv);
                        }
                      });
                    }
                  }
                  
                  // Update student tips
                  if (tutorials.student && tutorials.student.tips && tutorials.student.tips.length > 0) {
                    var studentTips = document.querySelector('#student-detail ul');
                    if (studentTips) {
                      studentTips.innerHTML = '';
                      tutorials.student.tips.forEach(function(tip) {
                        var li = document.createElement('li');
                        li.innerHTML = tip;
                        studentTips.appendChild(li);
                      });
                    }
                  }
                  
                  // Update teacher video
                  if (tutorials.teacher && tutorials.teacher.video) {
                    var teacherVideo = document.querySelector('#teacher-content video source');
                    if (teacherVideo) {
                      teacherVideo.src = '/home/video/' + tutorials.teacher.video;
                      var teacherParent = teacherVideo.parentElement;
                      teacherParent.load();
                    }
                  }
                  
                  // Update teacher title
                  if (tutorials.teacher && tutorials.teacher.title) {
                    var teacherTitle = document.querySelector('#teacher-detail h3');
                    if (teacherTitle) {
                      teacherTitle.textContent = tutorials.teacher.title;
                    }
                  }
                  
                  // Update teacher steps
                  if (tutorials.teacher && tutorials.teacher.steps && tutorials.teacher.steps.length > 0) {
                    var teacherDetail = document.getElementById('teacher-detail');
                    if (teacherDetail) {
                      var oldTeacherSteps = teacherDetail.querySelectorAll('div[style*="border-right: 4px solid var(--main-color)"]');
                      oldTeacherSteps.forEach(function(step) {
                        if (step.parentElement === teacherDetail) {
                          step.remove();
                        }
                      });
                      
                      var teacherTipsDiv = teacherDetail.querySelector('div[style*="#f8f9fa"]');
                      tutorials.teacher.steps.forEach(function(step) {
                        var stepDiv = document.createElement('div');
                        stepDiv.style.cssText = 'margin: 1.5rem 0; padding: 1rem; background: white; border-right: 4px solid var(--main-color); border-radius: 4px;';
                        stepDiv.innerHTML = '<h4 style="color: var(--main-color); margin-bottom: 0.8rem;">' + (step.title || '') + '</h4><p style="line-height: 1.6; color: #666;">' + (step.content || '') + '</p>';
                        if (teacherTipsDiv) {
                          teacherDetail.insertBefore(stepDiv, teacherTipsDiv);
                        } else {
                          teacherDetail.appendChild(stepDiv);
                        }
                      });
                    }
                  }
                  
                  // Update teacher tips
                  if (tutorials.teacher && tutorials.teacher.tips && tutorials.teacher.tips.length > 0) {
                    var teacherTips = document.querySelector('#teacher-detail ul');
                    if (teacherTips) {
                      teacherTips.innerHTML = '';
                      tutorials.teacher.tips.forEach(function(tip) {
                        var li = document.createElement('li');
                        li.innerHTML = tip;
                        teacherTips.appendChild(li);
                      });
                    }
                  }
                  
                  // Update general video
                  if (tutorials.general && tutorials.general.video) {
                    var generalVideo = document.querySelector('#all-content video source');
                    if (generalVideo) {
                      generalVideo.src = '/home/video/' + tutorials.general.video;
                      var generalParent = generalVideo.parentElement;
                      generalParent.load();
                    }
                  }
                  
                  // Update general title
                  if (tutorials.general && tutorials.general.title) {
                    var generalTitle = document.querySelector('#general-detail h3');
                    if (generalTitle) {
                      generalTitle.textContent = tutorials.general.title;
                    }
                  }
                  
                  // Update general steps
                  if (tutorials.general && tutorials.general.steps && tutorials.general.steps.length > 0) {
                    var generalDetail = document.getElementById('general-detail');
                    if (generalDetail) {
                      var oldGeneralSteps = generalDetail.querySelectorAll('div[style*="border-right: 4px solid var(--main-color)"]');
                      oldGeneralSteps.forEach(function(step) {
                        if (step.parentElement === generalDetail) {
                          step.remove();
                        }
                      });
                      
                      var generalTipsDiv = generalDetail.querySelector('div[style*="#f8f9fa"]');
                      tutorials.general.steps.forEach(function(step) {
                        var stepDiv = document.createElement('div');
                        stepDiv.style.cssText = 'margin: 1.5rem 0; padding: 1rem; background: white; border-right: 4px solid var(--main-color); border-radius: 4px;';
                        stepDiv.innerHTML = '<h4 style="color: var(--main-color); margin-bottom: 0.8rem;">' + (step.title || '') + '</h4><p style="line-height: 1.6; color: #666;">' + (step.content || '') + '</p>';
                        if (generalTipsDiv) {
                          generalDetail.insertBefore(stepDiv, generalTipsDiv);
                        } else {
                          generalDetail.appendChild(stepDiv);
                        }
                      });
                    }
                  }
                  
                  // Update general tips
                  if (tutorials.general && tutorials.general.tips && tutorials.general.tips.length > 0) {
                    var generalTips = document.querySelector('#general-detail ul');
                    if (generalTips) {
                      generalTips.innerHTML = '';
                      tutorials.general.tips.forEach(function(tip) {
                        var li = document.createElement('li');
                        li.innerHTML = tip;
                        generalTips.appendChild(li);
                      });
                    }
                  }
                }
              })
              .catch(function(err) {
                console.error('Error loading tutorials:', err);
              });
          })();
        `}
      </Script>
    </>
  );
}
