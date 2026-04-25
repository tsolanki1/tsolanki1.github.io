(function () {
  var authConfig = window.SITE_AUTH || {};
  var passwordPlaintext = String(authConfig.password || "");
  var body = document.body;
  var overlay = document.getElementById("authOverlay");
  var form = document.getElementById("authForm");
  var passwordInput = document.getElementById("sitePassword");
  var errorNode = document.getElementById("authError");

  if (!passwordPlaintext || !body || !overlay || !form || !passwordInput) {
    unlockSite();
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    hideError();

    if (String(passwordInput.value || "").trim() === passwordPlaintext) {
      unlockSite();
      return;
    }

    showError();
    passwordInput.focus();
    passwordInput.select();
  });

  function unlockSite() {
    body.classList.remove("auth-pending");
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  function showError() {
    if (errorNode) {
      errorNode.hidden = false;
    }
  }

  function hideError() {
    if (errorNode) {
      errorNode.hidden = true;
    }
  }
}());
