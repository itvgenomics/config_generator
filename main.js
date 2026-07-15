// Pipeline Config Generator — main.js

document.addEventListener('DOMContentLoaded', () => {

  // Keyboard nav: Enter/Space activates card
  const cards = document.querySelectorAll('.pipeline-card');

  cards.forEach((card) => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = card.getAttribute('href');
      }
    });
  });

});
