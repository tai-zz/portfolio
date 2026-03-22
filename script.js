// Espaço para futuras interações
console.log("Portfólio carregado");

function copiarEmail() {
  const email = document.getElementById("email").innerText;

  navigator.clipboard.writeText(email);

  const toast = document.getElementById("toast");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}