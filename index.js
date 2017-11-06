const Discord = require("discord.js");
const fs = require("fs");
var config = JSON.parse(fs.readFileSync('./settings.json','utf-8'));
const discord_token = config.discord_token;
const client = new Discord.Client({
    token: discord_token,
    autorun: true
  });
const ytdl = require("ytdl-core");
const request = require("request");
const getYoutubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");
const yt_api_key = config.yt_api_key;
const prefix = config.prefix;

var test = 0;
var queue = [];
var queueNames= [];
var isPlaying = false;
var idNowPlaying = null;
var isMuted = false;
var isLoop = false;
var dispatcher = null;
var helpVal=0;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

});
client.on('message', msg => {
  if (msg.content === 'avatar') {
    msg.reply(msg.author.avatarURL);
  }
  if(msg.content === 'emoji')
  {
      var emojis2 = client.emojis.random(Array.from(client.emojis.values()).length);

      msg.reply(emojis2+" ");
  }
  if(msg.content === 'test')
  {
    msg.channel.send('test test test', {tts:true});
  }
});
client.on('message', message=>{
  if (!message.guild) return;
  if (message.content.startsWith(prefix+"join")) {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voiceChannel) {
      message.member.voiceChannel.join()
        .then(connection => { // Connection is an instance of VoiceConnection
          message.channel.send('✅ I have successfully connected to the channel!');
        })
        .catch(console.log);
    } else {
      message.channel.send('❌ You need to join a voice channel first!');
    }
  }
});
client.on('message', msg=>{
  const member = msg.member;
  const mess = msg.content.toLowerCase();
  const args = msg.content.split(' ').slice(1).join(" ");

    if(mess.startsWith(prefix + "play")){
          if(queue.length > 0 || isPlaying)
          {
            getID(args,function(id){
              addToQueue(id);
              fetchVideoInfo(id, function(err, videoInfo){
                if(err) throw new Error(err);
                msg.channel.send("✅ Added to queue **" + videoInfo.title + "**" );
                queueNames.push(videoInfo.title);
              });
            });
          } else {
            isPlaying = true;
            getID(args, function(id){
              addToQueue(id);
              playMusic(id, msg);
              fetchVideoInfo(id, function(err, videoInfo){
                if(err) throw new Error(err);
                msg.channel.send("🎵 Now playing **" + videoInfo.title + "** [ "+Math.trunc(videoInfo.duration/60) +" min " + (videoInfo.duration%60) + " sec ]");
                queueNames.push(videoInfo.title);
              });
            });
          }
    }
    else if(mess.startsWith(prefix+"skip")){
      skip_song(msg);
    }
    else if(mess.startsWith(prefix+"queue")){
      showQueue(msg);
    }
    else if(mess.startsWith(prefix+"now")){
      nowPlaying(msg);
    }
    else if(mess.startsWith(prefix+"ciszej")){
      ciszej(args,msg);
    }
    else if(mess.startsWith(prefix+"glosniej")){
      glosniej(args,msg);
    }
    else if(mess.startsWith(prefix+"glosnosc")){
      glosnosc(msg);
    }
    else if(mess.startsWith(prefix+"mute")){
      dispatcher.setVolume(mute(dispatcher.volume,msg));
    }
    else if(mess.startsWith(prefix+"loop")){
        toggleLoop(msg);
    }
});
client.login(discord_token);
function getID(str, cb){
  if(isYoutube(str))
  {
    cb(getYoutubeID(str));
  }else{
    search_video(str, function(id){
      cb(id);
    });
  }
}
function toggleLoop(message){
  if(isLoop){
    isLoop = false;
    message.channel.send("❌ Not looping!");
  }else {
    isLoop = true;
    message.channel.send("✅ Looping!");
  }
}
function mute(curVal,message){
  if(isMuted){
    isMuted = false;
    curVal = helpVal;
    message.channel.send("✅ Unmuted!");
  }else {
    isMuted = true;
    helpVal = curVal;
    curVal = 0;
    message.channel.send("❌ Muted!");
  }
  return curVal;
}
function glosnosc(message){
    var vol = dispatcher.volume;
    message.channel.send("🔊 Glosnosc: "+vol.toFixed(2));
}
function glosniej(args,message){
  var vol = dispatcher.volume;
  var vol2=0.0;
  if(args==="")
  {
    if(!isMuted)
    {
      dispatcher.setVolume(vol+0.2);
      vol2 = dispatcher.volume;
    }
  }else if(isNaN(args)){
    args=1;
    if(!isMuted)
    {
      dispatcher.setVolume(args);
      vol2 = dispatcher.volume;
    }
  }
  else {
    if(!isMuted)
    {
      dispatcher.setVolume(vol+(args/100)*vol);
      vol2 = dispatcher.volume;
    }
  }
  message.channel.send("🔊 Glosnosc: "+vol2.toFixed(2));
}
function ciszej(args,message){
  var vol = dispatcher.volume;
  var vol2=0.0;
  if(args==="")
  {
    if(!isMuted)
    {
      dispatcher.setVolume(vol-0.2);
      vol2=dispatcher.volume;
    }
  }else if(isNaN(args)){
    args=1;
    if(!isMuted)
    {
      dispatcher.setVolume(args);
      vol2 = dispatcher.volume;
    }
  }
  else {
    if(!isMuted)
    {
      dispatcher.setVolume(vol-(args/100)*vol);
      vol2=dispatcher.volume;
    }
  }
  message.channel.send("🔊 Glosnosc: "+vol2.toFixed(2));
}
function skip_song(message){
  if(queue.length>0){
    message.channel.send("✅ Skipping now!");
  }else {
    message.channel.send("❌ Can't skip, there is no queue!");
  }
  if(isLoop){
    isLoop=false;
    dispatcher.end();
    isLoop=true;
  }else {
    dispatcher.end();
  }


}
function playMusic(id, message){
  voiceChannel = message.member.voiceChannel;
  voiceChannel.join().then(function(connection){
    stream = ytdl("https://www.youtube.com/watch?v="+ id, {
      filter: "audioonly"
    });
    dispatcher = connection.playStream(stream);
    idNowPlaying=id;
    dispatcher.on('end', function(){
      if(!isLoop){
          queue.shift();
          queueNames.shift();
          if(queue.length === 0){
            queue = [];
            queueNames =[];
            isPlaying = false;
          }else {
              setTimeout(function() {
                          playMusic(queue[0], message);
              }, 500);
          }
      }else { // jeżeli jest włączony loop i skonczyla sie grac piosenka - to jezeli w queue jest 1 piosenka to znowu ja graj a jak nie to przeskocz dalej
        var dlugosc = queue.length;
        if(dlugosc>1) // jezeli kolejka nie jest pusta
        {
          if(test!=(dlugosc-1)) // jezeli nie jest ostatnia piosenka to graj nastepna
          {
            setTimeout(function() {
                        test++;
                        isLoop=false;
                        playMusic(queue[test], message);
                        test++;
                        isLoop=true;
            }, 500);
          }else if(test==(dlugosc-1)) { // jezeli jest ostatnia piosenka to graj pierwsza
              setTimeout(function() {
                          test=0;
                          isLoop=false;
                          playMusic(queue[test], message);
                          isLoop=true;
              }, 500);
          }
        }else { // jezeli dlugosc jest rowna 0 lub 1
          test=0;
          if(queue.length != 0){
            setTimeout(function() {
                        playMusic(queue[test], message);
            }, 500);
          }else {
            isPlaying = false;
          }
        }
      }
    });
  });
}
function getNowPlaying()
{
  return idNowPlaying;
}
function showQueue(message){
  if(queue.length < 1){
    message.channel.send("⚠️ Queue is empty!");
  }else {
    for(var i=0 ; i<queueNames.length; i++)
    {
      message.channel.send("```["+i+"] " + queueNames[i]+"```");
    }
  }
}
function getTitle(id,message){
  fetchVideoInfo(id, function(err, videoInfo){
      if(err) throw new Error(err);
      message.channel.send(videoInfo.title);
  });
}
function nowPlaying(message){
  if(idNowPlaying != null)
  {
    fetchVideoInfo(idNowPlaying, function(err, videoInfo){
      if(err) throw new Error(err);
      message.channel.send("🎵 Now playing **" + videoInfo.title + "** [ "+Math.trunc(videoInfo.duration/60) +" min " + (videoInfo.duration%60) + " sec ]");
    });
  }else {
    message.channel.send("🔇 Nothing is playing now.");
  }
}
function addToQueue(strID){
  if(isYoutube(strID))
  {
    queue.push(getYoutubeID(strID));
  } else{
    queue.push(strID);
  }
}
function search_video(query, callback){
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        if (!json.items[0]) callback("3_-a9nVZYjk");
        else {
            callback(json.items[0].id.videoId);
        }
    });
}
function isYoutube(str){
  return str.toLowerCase().indexOf("youtube.com") > -1;
}
