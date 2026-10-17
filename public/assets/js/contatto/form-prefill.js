(function () {
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("a[data-tipo], a[data-project]") : null;
    if (!el) return;
    var value = el.getAttribute("data-tipo");
    var project = el.getAttribute("data-project");
    setTimeout(function () {
      if (project) {
        var message = document.querySelector('#qz-form textarea[name="messaggio"]');
        var reference = 'Mi interessano riprese come «' + project + '».';
        if (message && message.value.indexOf(reference) === -1) {
          message.value = reference + (message.value ? '\n' + message.value : '');
          message.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      if (!value) return;
      var tiles = document.querySelectorAll("#qz-form .qz-tile");
      var label = value === 'Video' ? 'Riprese da montare' : value;
      for (var i = 0; i < tiles.length; i++) {
        var title = tiles[i].querySelector(".qz-tile__t");
        if (tiles[i].getAttribute('data-value') === value || (title && (title.textContent === value || title.textContent === label))) {
          tiles[i].click();
          break;
        }
      }
    }, 60);
  }, true);
})();
