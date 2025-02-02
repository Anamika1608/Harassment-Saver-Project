const app = require('./app');
const mongoose = require('mongoose');

const port = process.env.PORT || 3001;
app.listen(port, async () => {
  try{
    await mongoose.connect(process.env.mongoConnectionString)
    console.log(`Listening: http://localhost:${port}`);
  }
  catch(e){
    console.log(`Connection with db failed, Error: ${e}`);
  }
});
