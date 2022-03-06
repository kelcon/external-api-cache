const functions = require("firebase-functions");
const md5 = require('md5');
const axios = require('axios');

const faunadb = require('faunadb')
const q = faunadb.query
const client = new faunadb.Client({
	secret: 'fnAEhAWrVeACSTLp_P8OLP7Sz7OHI8QpbhmbAcJw'
})

const cities = require('./cities.js')

const cyrb53 = function(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1>>>0);
};


/*
// The Firebase Admin SDK to access Cloud Firestore.
const admin = require('firebase-admin');
admin.initializeApp();

const openWeatherAPICollectionName = 'openWeatherAPI';
const openWeatherAPITTL = 60* 60; // 1h
*/

// /onecall?lat=52&lon=20&units=metric&lang=pl&appid=bd6a08374589a54b06f1e528d900bb80
// uri=%2Fonecall%3Flat%3D52%26lon%3D20%26units%3Dmetric%26lang%3Dpl%26appid%3Dbd6a08374589a54b06f1e528d900bb80

exports.scheduledOpenWeatherAPIOneCall = functions
  .runWith({
  	timeoutSeconds: 540,
  })
  .pubsub.schedule('45 * * * *')
  .timeZone('Europe/Warsaw') // Users can choose timezone - default is America/Los_Angeles
  .onRun(async (context) => {

	    const names = Object.keys(cities);

	    for (let i = 0; i < names.length; i++) {

	      const name = names[i];
	      const city = cities[name];
	      const lat = city.lat;
	      const lng = city.lng
	      const hash = cyrb53(lat+","+lng);

		  console.log('Fetching for '+name+ ' with hash '+hash);	

	      const faunaCacheExists = await client.query(
	        q.Exists(
	          q.Ref(q.Collection('onecall'), hash)
	        )
	      );

	      const instance = axios.create({
	        //baseURL: 'https://us-central1-external-api-cache.cloudfunctions.net/',
	        baseURL: 'https://api.openweathermap.org/data/2.5/',
	        timeout: 10000,
	        headers: {'User-Agent': 'gdzie-deszcz/1.0'}
	      });

	      response = await instance.get('/onecall?lat='+lat+'&lon='+lng+'&units=metric&lang=pl&appid=bd6a08374589a54b06f1e528d900bb80');
	      //const response = await instance.get('/openWeatherAPI?uri=' + encodeURIComponent('/onecall?lat='+lat+'&lon='+lng+'&units=metric&lang=pl&appid=bd6a08374589a54b06f1e528d900bb80'));

	      if (response.status != 200) {
	        throw "Connection error";
	      }

	      if (faunaCacheExists === true) {
	        const faunaUpdateResponse = await client.query(
	          q.Update(q.Ref(q.Collection("onecall"), cyrb53(lat+","+lng)), {data: response.data })
	        );
	      }

	      if (faunaCacheExists === false) {
	        const faunaCreateResponse = await client.query(
	          q.Create(q.Ref(q.Collection("onecall"), cyrb53(lat+","+lng)), {data: response.data })
	        );
	      }

/*
		 if (i > 10) {
			  console.log("Breaking - only one city to not exceed quota");
			  break;
		}
*/
	    await new Promise(r => setTimeout(r, 5000));

	}


  return null;
});

/*
exports.openWeatherAPI = functions.https.onRequest( async (req, res) => {

	functions.logger.info("openWeatherAPI Call Initialized", {structuredData: true});
	
	try {

		if (typeof req.query.uri !== "string") {
			throw "No uri defined";
		}

		const uri = req.query.uri;
		const hash = md5(uri);

		const readResult = await admin.firestore().collection(openWeatherAPICollectionName).doc(hash).get();

		if (readResult.exists) {

			const data = readResult.data();

			if (data.expireAt.toDate() > new Date()) {
				functions.logger.info("Responsing with cached content", {structuredData: true});
				res.json(data.content);				
				return;				
			}

			functions.logger.info("openWeatherAPI Content Expired", {structuredData: true});

		}

		const instance = axios.create({
			baseURL: 'https://api.openweathermap.org/data/2.5/',
			timeout: 2000,
			headers: {'User-Agent': 'gdzie-deszcz/1.0'}
		});

		const response = await instance.get(uri);

		if (response.status != 200) {
			throw "Connection error";
		}

		if (typeof response.data === "undefined") {
			throw "No data";
		}

		functions.logger.info("Responsing with fresh content", {structuredData: true});

    	const writeResult = await admin.firestore().collection(openWeatherAPICollectionName).doc(hash).set({
    		content: response.data,
    		lastModified: new Date(),
    		expireAt: new Date(new Date().getTime()+(openWeatherAPITTL*1000))
    	});	

		res.json(response.data);		

	} catch(err) {
		res.status(500).send(err.toString());
	}



 });

*/

      