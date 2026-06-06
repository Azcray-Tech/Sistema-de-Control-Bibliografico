/**
 * @description Punto de entrada para producción/desarrollo. Inicializa BD e inicia el servidor HTTP.
 */
const { app, iniciar } = require('./app');
const PORT = process.env.PORT || 3000;

iniciar()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor iniciado en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al iniciar el servidor:', err);
    process.exit(1);
  });
