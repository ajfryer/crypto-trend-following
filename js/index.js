'use strict';

// jquery selectors
const $document = $(document);
const $window = $(window);
const $header = $('header');
const $nav = $('nav');

// makes nav visible or invisible based on nav scroll height
const setNavVisibility = () => {
  if ($window.scrollTop() > $header.height() * 0.66) {
    $nav.removeClass('invisible').addClass('visible');
  } else {
    $nav.removeClass('visible').addClass('invisible');
  }
};

const linkClickListener = () => {
  $('a[href*="#"]').on('click', function (e) {
    e.preventDefault();
    $('html, body').animate(
      {
        scrollTop: $($(this).attr('href')).offset().top,
      },
      500,
      'linear'
    );
  });
};

// on document load, set nav visibility and scroll event handler
$(
  (() => {
    setNavVisibility();
    linkClickListener();
    $document.on('scroll', () => setNavVisibility());
  })()
);
