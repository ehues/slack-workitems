
function bark(msg) {
    msg.reply("woof!");
}


function config(sess) {
    sess.on(/\s*good boy\s*/, bark);
    sess.on(/\s*:meat_on_bone:\s*/, bark);
    sess.on(/\s*:poultry_leg:\s*/, bark);
}

module.exports = config;
