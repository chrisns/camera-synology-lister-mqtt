const request = require('request-promise')
const mqtt = require('mqtt')

const {SYNOLOGY_HOST, SYNOLOGY_USER, SYNOLOGY_PASS, MQTT_HOST, MQTT_USER, MQTT_PASS, TOPIC_PREFIX} = process.env;

var session_id

const authenticate = () => request(`${SYNOLOGY_HOST}/webapi/auth.cgi?api=SYNO.API.Auth&method=Login&version=3&account=${SYNOLOGY_USER}&passwd=${SYNOLOGY_PASS}&session=SurveillanceStation&format=sid`)
  .then(JSON.parse)
  .tap(console.info)
  .then(response => session_id = response.data.sid)

const get_cameras = () => request(`${SYNOLOGY_HOST}/webapi/entry.cgi?api=SYNO.SurveillanceStation.Camera&method=List&version=3&_sid=${session_id}`)
  .then(JSON.parse)
  .tap(console.info)
  .then(response => cameras = response.data.cameras)

const get_feed_urls = () => cameras.map(camera => {
  return {
    name: camera.name,
    url: `${SYNOLOGY_HOST}/webapi/SurveillanceStation/videoStreaming.cgi?api=SYNO.SurveillanceStation.VideoStream&version=1&method=Stream&cameraId=${camera.id}&format=mjpeg&_sid=${session_id}`
  }
})

authenticate()
  .then(get_cameras)
  .then(get_feed_urls)
  .tap(console.info)
  .each((url, i) => publish(`${TOPIC_PREFIX}/${i}`, JSON.stringify(url), {retain: true}))
  .finally(() => client.end(false, () => process.exit(0)))

const client = mqtt.connect(MQTT_HOST, {
  username: MQTT_USER,
  password: MQTT_PASS
})

const publish = (topic, message, options = {}) =>
  new Promise((resolve, reject) => {
    client.publish(topic, message, options, err => {
      if (err) reject(err)
      resolve()
    })
  })