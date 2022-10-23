 
const guid = require('./guid.js')

/*

options:

 lat - required
 lng - required
 owa_onecall - optional
 owa_weather - optional

*/

module.exports = ( options ) => {

  let weather = {
    id: guid(),
    lastUpdated: Date.now(),
    current: {},
    hourly: [],
    geo: {
      lat: options.lat,
      lng: options.lng
    }
  };

  console.log(JSON.stringify(options));

  /* Current Weather from OpenWeatherAPI's OneCall) */

  if (typeof options.owa_onecall !== "undefined") {
      weather.current.temp        = Math.round(options.owa_onecall.current.temp);    
      weather.current.feels_like  = Math.round(options.owa_onecall.current.feels_like);  
      weather.current.pressure    = Math.round(options.owa_onecall.current.pressure);
      weather.current.humidity    = Math.round(options.owa_onecall.current.humidity);  
      weather.current.wind_speed  = Math.round(options.owa_onecall.current.wind_speed);  
      weather.current.wind_deg    = Math.round(options.owa_onecall.current.wind_deg);
      weather.current.wind_gust   = Math.round(options.owa_onecall.current.wind_gust); 
      weather.current.visibility  = Math.round(options.owa_onecall.current.visibility);   

      weather.current.one_hour_precipitation = false;

      if (typeof options.owa_onecall.minutely !== "undefined") {
        options.owa_onecall.minutely.forEach( minuteData => {
          if (minuteData.precipitation > 0) {
            weather.one_hour_precipitation = true;
          }
        })       
      }
      

  }

  /* Hourly Weather from OpenWeatherAPI's OneCall */

  if (typeof options.owa_onecall !== "undefined") {

      options.owa_onecall.hourly.forEach( hourlyData => {

        const date = new Date(hourlyData.dt * 1000);

        const item = {
          hour:       date.toLocaleString('pl-PL', {hour: '2-digit', hour12: false, timeZone: 'Europe/Warsaw'}),    
          temp:       Math.round(hourlyData.temp),   
          feels_like: Math.round(hourlyData.feels_like),
          pressure:   Math.round(hourlyData.pressure),
          humidity:   Math.round(hourlyData.humidity),
          clouds:     Math.round(hourlyData.clouds),
          wind_speed: Math.round(hourlyData.wind_speed),
          wind_deg:   Math.round(hourlyData.wind_deg),
          wind_gust:  Math.round(hourlyData.wind_gust),
          visibility: Math.round(hourlyData.visibility),
          pop:        Math.round(hourlyData.pop * 100),
          rain:       typeof hourlyData.rain !== "undefined",
          snow:       typeof hourlyData.snow !== "undefined",
        }

        weather.hourly.push(item);
      });
  }

  /* Current from OpenWeatherAPI's Weather */

  if (typeof options.owa_weather !== "undefined") {

      weather.current.temp        = Math.round(options.owa_weather.main.temp);    
      weather.current.feels_like  = Math.round(options.owa_weather.main.feels_like);  
      weather.current.pressure    = Math.round(options.owa_weather.main.pressure);
      weather.current.humidity    = Math.round(options.owa_weather.main.humidity);  
      weather.current.wind_speed  = Math.round(options.owa_weather.wind.speed);  
      weather.current.wind_deg    = Math.round(options.owa_weather.wind.deg);
      weather.current.wind_gust   = typeof options.owa_weather.wind.gust !== "undefined" ? Math.round(options.owa_weather.wind.gust) : Math.round(options.owa_weather.wind.speed); 
      weather.current.visibility  = Math.round(options.owa_weather.visibility); 

      weather.current.one_hour_precipitation = (typeof options.owa_weather.snow !== "undefined" && typeof options.owa_weather.snow['1h'] !== "undefined") || (typeof options.owa_weather.rain  !== "undefined" && typeof options.owa_weather.rain['1h'] !== "undefined");

  }

  return weather;


}

