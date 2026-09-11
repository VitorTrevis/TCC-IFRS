const app = require('./app');
const { ARQUIVO_DB } = require('./db');

const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
  console.log('');
  console.log('  Campeonatos Escolares');
  console.log(`  Servidor:  http://localhost:${PORTA}`);
  console.log(`  Banco:     ${ARQUIVO_DB}`);
  console.log('');
});
