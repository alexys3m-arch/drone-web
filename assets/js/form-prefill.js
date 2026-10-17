(function () {
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("a[data-tipo]") : null;
    if (!el) return;
    var value = el.getAttribute("data-tipo");
    setTimeout(function () {
      var tiles = document.querySelectorAll("#qz-form .qz-tile");
      for (var i = 0; i < tiles.length; i++) {
        var t = tiles[i].querySelector(".qz-tile__t");
        if (t && t.textContent === value) { tiles[i].click(); break; }
      }
    }, 60);
  });
})();
