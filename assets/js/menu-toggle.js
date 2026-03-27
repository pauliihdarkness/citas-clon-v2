/**
 * Mobile Menu Toggle Logic
 */
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.querySelector('nav');
  const body = document.body;

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('menu-open');
      menuToggle.classList.toggle('active');
      
      // Control scroll on body when menu is open
      if (isOpen) {
        body.style.overflow = 'hidden';
      } else {
        body.style.overflow = '';
      }
    });

    // Close menu when clicking a link
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('menu-open');
        menuToggle.classList.remove('active');
        body.style.overflow = '';
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('menu-open') && 
          !nav.contains(e.target) && 
          !menuToggle.contains(e.target)) {
        nav.classList.remove('menu-open');
        menuToggle.classList.remove('active');
        body.style.overflow = '';
      }
    });
  }
});
