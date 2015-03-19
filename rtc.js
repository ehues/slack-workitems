
var html2text = require('html-to-text');
var WorkItems = require('./wi.js');
var relDate = require('relative-date');
var format = require('string-template');


// Consume our configuration 
var REPO = process.env.RTC_REPO;
var USER = process.env.RTC_USER;
var PASS = process.env.RTC_PASS;

var TOKEN = process.env.RTC_BOT_TOKEN;
var WEBHOOK = process.env.RTC_WEBHOOK;
var TEAM = process.env.RTC_TEAM;

var RTC_URI_OVERRIDE = process.env.RTC_URI_OVERRIDE;

var wiFetcher = new WorkItems(REPO, USER, PASS);


var Session = require('slackr-bot');

var sess = new Session({
//    token: 'xoxp-3930341205-3930341229-3932599084-fc55c8',
    token: TOKEN,
    webhookClient: {
//        token: 'T03TCA161/B03UE32L6/xGfWb9HsEFTdVaPG5oByKCIa',
        token: WEBHOOK,
//        team: 'ljkadljkasdljaksfajlf'
        team: TEAM
    }
});


// Handling for rewriting the link on a work item. This allows us to 
// make work items viewable outside a firewall. 
function wiLinkPassThrough(wi) {
    return wi['rdf:resource'];
}

function wiLinkRewrite(wi) {
    return format(RTC_URI_OVERRIDE, wi['dc:identifier']);
}

var rewriteLink = wiLinkPassThrough;

if (RTC_URI_OVERRIDE) {
    console.log('rewriting');
    rewriteLink = wiLinkRewrite;
}


// The handler for matches on the channel
function handleWorkItemMatch(message, match) {
    console.log("got " + match[1]);

    message.typing();

    wiFetcher.fetchOSLC(match[1]).then(function(wi) {
//        console.log(wi);
        var titleText = "Bug " + wi["dc:identifier"] + ": " + html2text.fromString(wi["dc:title"]);

        console.log(titleText);

        var statusLine = '';
        if (wi["rtc_cm:ownedBy"] && wi["rtc_cm:ownedBy"]["rdf:resource"]) {
            var ownerUri = wi["rtc_cm:ownedBy"]["rdf:resource"];
            var lastSlash = ownerUri.lastIndexOf('/');
            if (-1 != lastSlash) {
                var userName = ownerUri.substring(lastSlash + 1);

                statusLine += '_Owned by *' + userName + '*_. ';
            }
        }

        if (wi["dc:creator"] && wi["dc:creator"]["rdf:resource"]) {
            var ownerUri = wi["dc:creator"]["rdf:resource"];
            var lastSlash = ownerUri.lastIndexOf('/');
            if (-1 != lastSlash) {
                var userName = ownerUri.substring(lastSlash + 1);

                statusLine += '_Created by *' + userName + '*_. ';
            }
        }

        if (wi["rtc_cm:subscribers"]) {
            var subCount = wi["rtc_cm:subscribers"].length;
            if (subCount == 1) {
                statusLine += '_One subscriber_. ';
            }
            else {
                statusLine += '_' + subCount + " subscribers_. ";
            }
        }

        if (wi["rtc_cm:comments"]) {
            var ct = wi["rtc_cm:comments"].length;
            if (ct == 1) {
                statusLine += '_One comment_. ';
            }
            else {
                statusLine += '_' + ct + ' comments_. ';
            }
        }

        if (wi["dc:created"]) {
            var created = Date.parse(wi["dc:created"]);

            statusLine += '_Created ' + relDate(created) + '_. ';
        }

        if (wi["dc:modified"]) {
            var mod = Date.parse(wi["dc:modified"]);

            statusLine += '_Last modified ' + relDate(mod) + '_. ';
        }

        message.reply({
            text: '',
            attachments: [{
                    fallback: titleText,
                    title: titleText,
                    title_link: rewriteLink(wi),
                    text: statusLine + "\n" + html2text.fromString(wi['dc:description']),
                    color: "#7CD197",
                    mrkdwn_in: ["pretext", "text"]
            }]
        });
    }, function(err) {
        console.log("Error");
        console.log(err);

        message.reply({
            text: err
        });
    });

}

sess.on(/bug\s*(\d+)/i, handleWorkItemMatch);
sess.on(/http\S*action=com.ibm.team.workitem.viewWorkItem\S*id=(\d+)/i, handleWorkItemMatch);
