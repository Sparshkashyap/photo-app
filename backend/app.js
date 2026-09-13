require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 3000;


app.get('/', (req, res) => {
  res.send('Welcome to the Photo App API');
})

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
