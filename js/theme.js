const btn = document.getElementById("toggleTheme");

function initTheme() {
  // chk local storage
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark");
    btn.innerText = "🌙";
    return;
  }
  if (theme === "light") {
    btn.innerText = "🌞";
    return;
  }

  //   visit first time
  const isDark = window.matchMedia("(prefers-color-scheme: dark)");
  if (isDark) document.body.classList.add("dark");

  localStorage.setItem("theme", isDark ? "dark" : "light");
  btn.innerText = isDark ? "🌙" : "🌞";
}

function toggleTheme() {
  console.log(`toggle theme`);
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
  btn.innerText = document.body.classList.contains("dark") ? "🌙" : "🌞";
}

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    const newColorScheme = e.matches ? "dark" : "light";
    localStorage.setItem("theme", newColorScheme);

    if (newColorScheme === "dark") {
      document.body.classList.add("dark");
      btn.innerText = "🌙";
      return;
    }
    document.body.classList.remove("dark");
    btn.innerText = "🌞";
  });

btn.addEventListener("click", function (event) {
  toggleTheme();
});

initTheme();
