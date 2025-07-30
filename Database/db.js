const {Client , Pool} = require('pg')
require('dotenv').config(); 
const { CONNECTION_STRING } = process.env;

var pool = new Pool({connectionString : CONNECTION_STRING , ssl : {rejectUnauthorized : false}});



async function getPgVersion() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT version()');
    console.log(result.rows[0]);
  } finally {
    client.release();
  }
}

async function getArticles(){
	
	const client = await pool.connect();
	
	const result = await client.query('SELECT * FROM ARTICLES');
	
	console.log(result.rows);
}
getPgVersion();
//getArticles();

module.exports = pool;
