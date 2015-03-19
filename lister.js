
var Promise = require('promise');

var fs = require('fs');

var REPO = process.env.RTC_REPO;
var USER = process.env.RTC_USER;
var PASS = process.env.RTC_PASS;

var OUTFILE = "/tmp/wis.csv";

var wi = require('wi.js').WorkItems();


// Clear out our output file
try {
    fs.unlinkSync(OUTFILE);
} catch (e) {
}
fs.appendFileSync(OUTFILE, "voters, subscribers, id, summary\n");

// Callback that gathers work items
function wiGatherer(wi) {
    var subCount = 0;
    var voteCount = 0;
    if (wi['rtc_cm:com.ibm.team.workitem.attribute.voting.upvoters']) {
        voteCount = wi['rtc_cm:com.ibm.team.workitem.attribute.voting.upvoters'].length;
    }

    // Write a wad of csv
    fs.appendFileSync(OUTFILE, "" + voteCount + ", " + wi['rtc_cm:subscribers'].length + ", " + wi['dc:identifier']+ ", \"" + wi['dc:title'].replace(/"/g, '""') + "\"\n");
}


// Callback that gathers the categories whose name starts with Source Control
var cats = [];
function categoryGatherer(cat) {
    var name = cat["rtc_cm:hierarchicalName"];
    if (name.lastIndexOf("Source Control", 0) === 0) {
        console.log("Got " + name);
        cats.push(cat);
    }
}


wi = new WorkItems(REPO, USER, PASS);
wi.login().then(function () {
    // Find all the work item categories
    return wi.queryForCategories("_1w8aQEmJEduIY7C8B09Hyw", categoryGatherer);
}).then(function () {
    var everyCatPromise = [];

    // Walk the work item categories and find the open WIs
    cats.forEach(function (cat) {
        var path = cat["rdf:resource"];
        var catName = cat["rtc_cm:hierarchicalName"];

        console.log("Checking " + catName);

        var catProm = wi.queryForWorkItems("_1w8aQEmJEduIY7C8B09Hyw", "rtc_cm:state=\"{open}\" and rtc_cm:filedAgainst=\"" + path + "\"", wiGatherer, ['dc:title', 'dc:identifier', 'rtc_cm:subscribers', 'rtc_cm:com.ibm.team.workitem.attribute.voting.upvoters']);
        everyCatPromise.push(catProm);
    });

    // vvv not necessary
    return Promise.all(everyCatPromise);
});

