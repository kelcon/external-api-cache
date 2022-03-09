
/* Dependenties */

const functions = require("firebase-functions");
const md5 		= require('md5');
const axios 	= require('axios');
const cyrb53 	= require('./cyrb53.js')
const faunadb 	= require('faunadb');
const cities 	= require('./cities.js')

/* Configuration */

const oneCallSchedule 	= '30 2,4,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23 * * *';
const currentSchedule   = '05 * * * *';
const timeZone 			= 'Europe/Warsaw';
const openWeatherAPIKey = 'bd6a08374589a54b06f1e528d900bb80';
const currentCollectionName = 'current';
const oneCallCollectionName = 'onecall';
const oneCallFunctionTimeout = 540;
const currentFunctionTimeout = 540;

/* Setup FaunaDB Client */

const q = faunadb.query
const client = new faunadb.Client({
	secret: 'fnAEhCHJ--ACS2BrgFbgrfV7yFwKCFeEz8Gdo46b'
})

/* Helpers */

const axiosOpenWeatherAIPGet = async (uri) => {

	const instance = axios.create({
		baseURL: 'https://api.openweathermap.org/data/2.5/',
		timeout: 10000,
		headers: {'User-Agent': 'gdzie-deszcz/1.0'}
	});

	return await instance.get(uri);	
}

const faunaExistsHelper = async (collection, id) => {
  return await client.query(
    q.Exists(
      q.Ref(q.Collection(collection), id)
    )
  );
}

const faunaUpdateHelper = async (collection, id, data) => {
  return await client.query(
	  q.Update(
	  	q.Ref(q.Collection(collection), id), {data: data }
	  )
  );
}

const faunaCreateHelper = async (collection, id, data) => {
  return await client.query(
	  q.Create(
	  	q.Ref(q.Collection(collection), id), {data: data }
	  )
  );
}

/* onecall fetching */

exports.scheduledOpenWeatherAPIOneCall = functions
  .runWith({
  	timeoutSeconds: oneCallFunctionTimeout,
  })
  .pubsub.schedule(oneCallSchedule)
  .timeZone(timeZone) // Users can choose timezone - default is America/Los_Angeles
  .onRun(async (context) => {

	    const names = Object.keys(cities);

	    for (let i = 0; i < names.length; i++) {

	      const name = names[i];
	      const city = cities[name];
	      const lat = city.lat;
	      const lng = city.lng
	      const hash = cyrb53(lat+","+lng);

		  console.log('Fetching for '+name+ ' with hash '+hash);	

	      const faunaCacheExists = await faunaExistsHelper(oneCallCollectionName, hash);

	      const response = await axiosOpenWeatherAIPGet('/onecall?lat='+lat+'&lon='+lng+'&units=metric&lang=pl&appid='+openWeatherAPIKey)

	      if (response.status != 200) {
	        throw "Connection error";
	      }

	      if (faunaCacheExists === true) {
	        const faunaUpdateResponse = await faunaUpdateHelper(oneCallCollectionName, hash, response.data);
	      }

	      if (faunaCacheExists === false) {
	      	const faunaUpdateResponse = await faunaCreateHelper(oneCallCollectionName, hash, response.data);
	      }

	    await new Promise(r => setTimeout(r, 5000));

	}

  return null;
});

/* onecall fetching */

exports.scheduledOpenWeatherAPICurrent = functions
  .runWith({
  	timeoutSeconds: currentFunctionTimeout,
  })
  .pubsub.schedule(currentSchedule)
  .timeZone(timeZone) // Users can choose timezone - default is America/Los_Angeles
  .onRun(async (context) => {

	    const names = Object.keys(cities);

	    for (let i = 0; i < names.length; i++) {

	      const name = names[i];
	      const city = cities[name];
	      const lat = city.lat;
	      const lng = city.lng
	      const hash = cyrb53(lat+","+lng);

		  console.log('Fetching for '+name+ ' with hash '+hash);	

	      const faunaCacheExists = await faunaExistsHelper(currentCollectionName, hash);

	      const response = await axiosOpenWeatherAIPGet('/weather?lat='+lat+'&lon='+lng+'&units=metric&lang=pl&appid='+openWeatherAPIKey)

	      if (response.status != 200) {
	        throw "Connection error";
	      }

	      if (faunaCacheExists === true) {
	        const faunaUpdateResponse = await faunaUpdateHelper(currentCollectionName, hash, response.data);
	      }

	      if (faunaCacheExists === false) {
	      	const faunaUpdateResponse = await faunaCreateHelper(currentCollectionName, hash, response.data);
	      }

	    await new Promise(r => setTimeout(r, 5000));

	}

  return null;
});




      