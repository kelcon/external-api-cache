
/* Dependenties */

const functions 		= require("firebase-functions");
const md5 					= require('md5');
const axios 				= require('axios');
const cyrb53 				= require('./cyrb53.js');
const faunadb 			= require('faunadb');
const cities 				= require('./cities.js');
const buildweather 	= require('./buildweather.js');
const faunahelper 	= require('./faunahelper.js')

/* Configuration */

const oneCallSchedule 			= '30 2,5,7,9,11,13,15,17,19,21,23 * * *';
const currentSchedule   		= '05 * * * *';
const timeZone 							= 'Europe/Warsaw';
const openWeatherAPIKey 		= 'bd6a08374589a54b06f1e528d900bb80'; // lk@keler.pl
//const openWeatherAPIKey     = 'ef8c3779dd4745d737d3bcf97dbbc0f9'; // lukaszkeler@live.com
const currentCollectionName = 'owa_weather';
const oneCallCollectionName = 'owa_onecall';
const weatherCollectionName = 'weather';
const oneCallFunctionTimeout = 540;
const currentFunctionTimeout = 540;

/* DB Connection */
/*
const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
});
*/

/* Setup FaunaDB Client */

let q, client;

try {

	q = faunadb.query
	client = new faunadb.Client({
		secret: 'fnAEhCHJ--ACS2BrgFbgrfV7yFwKCFeEz8Gdo46b' // openweatherapi_client_key
	})

} catch (e) {

	console.warn('Fauna ititating error: '+e.message);
	console.warn(e);

}


/* Helpers */

const axiosOpenWeatherAIPGet = async (uri) => {

	const instance = axios.create({
		baseURL: 'https://api.openweathermap.org/data/2.5/',
		timeout: 10000,
		headers: {'User-Agent': 'gdzie-deszcz/1.0'} // lk@keler.pl
//		headers: {'User-Agent': 'jakie-cisnie/0.2.0'} // lukaszkeler@live.com
	});

	return await instance.get(uri);	
}

/* onecall fetching */

const openWeatherAPIOneCall = async () => {

	try {

		console.log('openWeatherAPIOneCall: initiating');

	  const names = Object.keys(cities);

	  for (let i = 0; i < names.length; i++) {

	    const name = names[i];
	    const city = cities[name];
	    const lat = city.lat;
	    const lng = city.lng
	    const hash = cyrb53(lat+","+lng);

	  	// console.log('Fetching for '+name+ ' with hash '+hash);		      

	    const response = await axiosOpenWeatherAIPGet('/onecall?lat='+lat+'&lon='+lng+'&units=metric&lang=pl&appid='+openWeatherAPIKey)

	    if (response.status != 200) {
	      throw "Connection error";
	    }

	    await faunahelper.updateOrCreate(client, q, oneCallCollectionName, hash, response.data);

	    // console.log(response.data);

	    let weather = buildweather( {
	    	lat: lat,
	    	lng: lng,
	    	owa_onecall: response.data,
	    });

	    await faunahelper.updateOrCreate(client, q, weatherCollectionName, hash, weather);

	  	await new Promise(r => setTimeout(r, 5000));

			}

		console.log('openWeatherAPIOneCall: closing');

	  return null;

	} catch (e) {

		console.warn('openWeatherAPIOneCall: '+e.message);
		console.warn(e);

	}

}

/* weather fetching */

const openWeatherAPICurrent = async () => {

	try {

			console.log('openWeatherAPICurrent: initiating');

	    const names = Object.keys(cities);

	    for (let i = 0; i < names.length; i++) {

	      const name = names[i];
	      const city = cities[name];
	      const lat = city.lat;
	      const lng = city.lng
	      const hash = cyrb53(lat+","+lng);

		  	console.log('Fetching for '+name+ ' with hash '+hash);	

	      const response = await axiosOpenWeatherAIPGet('/weather?lat='+lat+'&lon='+lng+'&units=metric&lang=pl&appid='+openWeatherAPIKey)

	      if (response.status != 200) {
	        throw "Connection error";
	      }

	      await faunahelper.updateOrCreate(client, q, currentCollectionName, hash, response.data);  

	      if (await faunahelper.exists(client, q, oneCallCollectionName, hash)) {

	      	const onecallFromFauna = await faunahelper.get(client, q, oneCallCollectionName,hash);

	      	console.log(JSON.stringify(response.data));

	      	let weather = buildweather( {
			    	lat: lat,
			    	lng: lng,
			    	owa_onecall: onecallFromFauna.data,
			    	owa_weather: response.data,
			    });			   
	      	await faunahelper.updateOrCreate(client, q, weatherCollectionName, hash, weather); 
	      }
		   
	    	await new Promise(r => setTimeout(r, 5000));

			}

			console.log('openWeatherAPICurrent: closing');

		  return null;


	} catch (e) {

		console.warn('openWeatherAPICurrent: '+e.message);
		console.warn(e);

	}


}

/* Export of functions */

exports.scheduledOpenWeatherAPIOneCall = functions
  .runWith({
  	timeoutSeconds: oneCallFunctionTimeout,
  })
  .pubsub.schedule(oneCallSchedule)
  .timeZone(timeZone) // Users can choose timezone - default is America/Los_Angeles
  .onRun(async (context) => {

  	return await openWeatherAPIOneCall();

});


exports.scheduledOpenWeatherAPICurrent = functions
  .runWith({
  	timeoutSeconds: currentFunctionTimeout,
  })
  .pubsub.schedule(currentSchedule)
  .timeZone(timeZone) // Users can choose timezone - default is America/Los_Angeles
  .onRun(async (context) => {

  	return await openWeatherAPICurrent();
});

exports.forceOpenWeatherOneCall = functions  
  .runWith({
  	timeoutSeconds: oneCallFunctionTimeout,
  }).https.onRequest(async (req, res) => {

  	await openWeatherAPIOneCall();  	
	

  res.json({result: 'Ok'});
});

/*
async function test () {
	await openWeatherAPIOneCall();	
}

test();

*/