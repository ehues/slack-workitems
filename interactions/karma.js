
var fs = require("fs");

var karmaFile = "karma.json";

function save_karma(karma) {
    fs.writeFileSync(karmaFile, JSON.stringify(karma));
}

function load_karma() {
    var text;
    try {
        text = fs.readFileSync(karmaFile);
    } catch (err) {
        // We expect err.code === 'ENOENT' for the first run through
        return {};
    }

    if (null === text || undefined == text || "" == text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch (err) {
        console.log("failed to parse " + karmaFile);
        console.log(err);
        return {};
    }
}

function modify(user, amount) {
    var karma = load_karma();

    if (karma.hasOwnProperty(user)) {
        karma[user] += amount;
    }
    else {
        karma[user] = amount;
    }

    save_karma(karma);
}


function config(sess) {
    function karmaIncrement(msg, match) {
        msg.typing();

        var candidateName = match[1];

        if (candidateName.charAt(0) == '@') {
            // normalize
            candidateName = candidateName.substring(1);
        }

        for (var i = 0; i < sess.data.users.length; i++) {
            var u = sess.data.users[i];

            if (u.name == candidateName) {
                modify(candidateName, 1);
                break;
            }
        }
    }

    sess.on(/([a-z0-9_]+)\+\+/i, karmaIncrement);
    sess.on(/thanks ([a-z0-9_]+)/i, karmaIncrement);
    sess.on(/ty ([a-z0-9_]+)/i, karmaIncrement);

    sess.on(/karma\?/, function (msg, ignoredMatch) {
        var karma = load_karma();

        var pairs = [];
        for (var key in karma) {
            if (karma.hasOwnProperty(key)) {
                pairs.push({name: key, value: karma[key]});
            }
        }

        pairs.sort(function (a, b) {
            return b.value - a.value;
        });

        var message = "";
        for (var i = 0; i < pairs.length; i++) {
            message += pairs[i].name + ": " + pairs[i].value + "\n";
        }

        msg.reply({
            text: '',
            attachments: [{
                title: "Karma",
                text: message,
                mrkdwn_in: ["text"]
            }]
        });
    });
}

module.exports = config;
