const filter_btns = document.querySelectorAll(".filter-btn");
const skills_wrap = document.querySelector(".skills");
const skills_bars = document.querySelectorAll(".skill-progress");
const records_wrap = document.querySelector(".records");
const records_numbers = document.querySelectorAll(".number");
const footer_input = document.querySelector(".footer-input");
const hamburger_menu = document.querySelector(".hamburger-menu");
const navbar = document.querySelector("header nav");
const links = document.querySelectorAll(".links a");

footer_input.addEventListener("focus", () => {
  footer_input.classList.add("focus");
});

footer_input.addEventListener("blur", () => {
  if (footer_input.value != "") return;
  footer_input.classList.remove("focus");
});

function closeMenu() {
  navbar.classList.remove("open");
  document.body.classList.remove("stop-scrolling");
}

hamburger_menu.addEventListener("click", () => {
  if (!navbar.classList.contains("open")) {
    navbar.classList.add("open");
    document.body.classList.add("stop-scrolling");
  } else {
    closeMenu();
  }
});

links.forEach((link) => link.addEventListener("click", () => closeMenu()));

filter_btns.forEach((btn) =>
  btn.addEventListener("click", () => {
    filter_btns.forEach((button) => button.classList.remove("active"));
    btn.classList.add("active");

    let filterValue = btn.dataset.filter;

    $(".grid").isotope({ filter: filterValue });
  })
);

$(".grid").isotope({
  itemSelector: ".grid-item",
  layoutMode: "fitRows",
  transitionDuration: "0.6s",
});

window.addEventListener("scroll", () => {
  skillsEffect();
  countUp();
});

function checkScroll(el) {
  let rect = el.getBoundingClientRect();
  if (window.innerHeight >= rect.top + el.offsetHeight) return true;
  return false;
}

function skillsEffect() {
  if (!checkScroll(skills_wrap)) return;
  skills_bars.forEach((skill) => (skill.style.width = skill.dataset.progress));
}

function countUp() {
  if (!checkScroll(records_wrap)) return;
  records_numbers.forEach((numb) => {
    const updateCount = () => {
      let currentNum = +numb.innerText;
      let maxNum = +numb.dataset.num;
      let speed = 200;
      const increment = Math.ceil(maxNum / speed);

      if (currentNum < maxNum) {
        numb.innerText = currentNum + increment;
        setTimeout(updateCount, 1);
      } else {
        numb.innerText = maxNum;
      }
    };

    setTimeout(updateCount, 400);
  });
}

var mySwiper = new Swiper(".swiper-container", {
  speed: 1100,
  slidesPerView: 1,
  loop: true,
  autoplay: {
    delay: 5000,
  },
  navigation: {
    prevEl: ".swiper-button-prev",
    nextEl: ".swiper-button-next",
  },
});

// Prefill contact message when clicking a portfolio item and scroll to contact
document.querySelectorAll('.grid a').forEach(function(anchor) {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    var titleEl = anchor.querySelector('.img-description h3');
    var title = titleEl ? titleEl.textContent.trim() : '';
    var textarea = document.querySelector('textarea[name="message"]');
    if (textarea) {
      textarea.value = "السلام عليكم ورحمة الله بركاتة\n\nاريد ان انضم اليكم في تخصص\n(" + title + ")";
      textarea.focus();
    }
    var contact = document.getElementById('contact');
    if (contact) contact.scrollIntoView({ behavior: 'smooth' });
  });
});

// Intercept contact form submit to send a notification to admin
(function() {
  var contactForm = document.querySelector('form[action*="formsubmit.co"]');
  if (!contactForm) return;
  // create a small message area below the form for feedback
  var msgContainer = document.createElement('div');
  msgContainer.className = 'contact-message';
  msgContainer.style.cssText = 'margin-top:12px;padding:10px;border-radius:6px;display:none;';
  contactForm.parentNode.insertBefore(msgContainer, contactForm.nextSibling);

  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    msgContainer.style.display = 'none';

    var fname = contactForm.querySelector('input[name="fname"]')?.value || '';
    var lname = contactForm.querySelector('input[name="lname"]')?.value || '';
    var phone = contactForm.querySelector('input[name="phone"]')?.value || '';
    var email = contactForm.querySelector('input[name="email"]')?.value || '';
    var message = contactForm.querySelector('textarea[name="message"]')?.value || '';

    var notif = {
      to: 'admin',
      from: email || 'guest',
      fromName: (fname + ' ' + lname).trim() || 'زائر',
      message: `رسالة من: ${(fname + ' ' + lname).trim()}\nالبريد: ${email}\nالهاتف: ${phone}\n\n${message}`
    };

    // send to internal notifications API and show success message, do NOT redirect
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif)
    })
      .then(function(res) {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(function(data) {
        msgContainer.style.display = 'block';
        msgContainer.style.background = '#e6ffed';
        msgContainer.style.border = '1px solid #3bbf6e';
        msgContainer.style.color = '#064e3b';
        msgContainer.innerText = 'تم إرسال رسالتك إلى المسؤول وسيظهر إشعار له.';
        contactForm.reset();
      })
      .catch(function(err){
        msgContainer.style.display = 'block';
        msgContainer.style.background = '#ffe6e6';
        msgContainer.style.border = '1px solid #bf3b3b';
        msgContainer.style.color = '#5b0f0f';
        msgContainer.innerText = 'حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقًا.';
        console.error('Failed to send admin notification', err);
      });
  });
})();

/* Back-to-top visibility: show only after reaching #services */
(function() {
  var backBtnWrap = document.querySelector('.back-btn-wrap');
  var backBtn = document.querySelector('.back-btn');
  var services = document.getElementById('services');
  if (!backBtnWrap || !services) return;

  function updateBackVisibility() {
    var show = window.pageYOffset >= (services.offsetTop - 20);
    backBtnWrap.classList.toggle('visible', show);
  }

  window.addEventListener('scroll', updateBackVisibility, { passive: true });
  window.addEventListener('load', updateBackVisibility);
  document.addEventListener('DOMContentLoaded', updateBackVisibility);

  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
