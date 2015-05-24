var request = require('request');
var Promise = require('promise');

function WorkItems(repo, username, password) {
    this.req = request.defaults({
        jar: request.jar(),
        followAllRedirects: true,
        rejectUnauthorized: false
    });

    this.repo = repo;
    this.username = username;
    this.password = password;
}

WorkItems.prototype.fetchOSLC = function(workitemNumber, avoidLogin) {
    var self = this;
    return new Promise(function(resolve, reject) {
        self.req.get(self.repo + "/oslc/workitems/" + workitemNumber + ".json",
            function (err, resp, body) {
                console.log(err);
                if (err) {
                    reject(err);
                    return;
                }

                if (resp.statusCode == 401) {
                    // login and retry
                    if (avoidLogin) {
                        reject("Log in failure when fetching work item.");
                        return; 
                    }

                    return self.login().then(function() {
                        console.log("after login");
                        self.fetchOSLC(workitemNumber, true).then(resolve, reject);
                    }, reject);
                }
                
                if (resp.statusCode == 200) {
                    resolve(JSON.parse(body));
                }
                else {
                    reject("Couldn't fetch work item. Got a " + resp.statusCode + " during request.");
                }

            }
        );
    });
};


WorkItems.prototype.login = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
		self.req.get(self.repo + "/authenticated/identity", function(err, resp, body) {
		    if (err) {
		        return reject(err);
		    }
		    if (resp.statusCode != 401) {
		        console.log("/auth/id");
		        return reject("Error during login. Unexpected status code " + resp.statusCode + ".");
		    }
		
		    self.req.post(self.repo + "/authenticated/j_security_check", {
		        form: {
		            j_username: self.username,
		            j_password: self.password
		        }
		    }, function(err, resp, body) {
		        if (resp.statusCode != 404 && resp.statusCode != 500) {
		            console.log("/auth/j_sec");
		            return reject("Unexpected status code after login " + resp.statusCode + ".");
		        }
		        
                resolve(self);
		    });
		});
    });
};


WorkItems.prototype.queryForCategories = function(paId, perCategoryCallback) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var uri = self.repo + "/oslc/categories?oslc_cm.query=";

        uri += encodeURIComponent("rtc_cm:projectArea=\"" + paId + "\"");
        console.log(uri);

        var catsHandled = 0;
        var resultGatherer;
        resultGatherer = function(err, resp, body) {
            if (err) {
                return reject(err);
            }
            
		    if (resp.statusCode != 200) {
		        console.log("status code " + resp.statusCode);
		        return reject("Error during login. Unexpected status code " + resp.statusCode + ".");
		    }
		
            
            var answer = JSON.parse(body);

            answer["oslc_cm:results"].forEach(perCategoryCallback);
            catsHandled += answer["oslc_cm:results"].length;
            console.log("Handled " + catsHandled + " of " + answer["oslc_cm:totalCount"]);

            if (answer["oslc_cm:next"]) {
        		self.req.get(answer["oslc_cm:next"], {headers: {
                    'accept': 'application/json'
                }}, resultGatherer);
            }
            else {
                resolve();
            }
        };

		self.req.get(uri, {headers: {
            'accept': 'application/json'
        }}, resultGatherer);
    });
}


/**
 * Fire the callback once for each workitem. Returns a promise that is resolved 
 * when all of the work items have been queried
 */
WorkItems.prototype.queryForWorkItems = function(paId, queryString, perWorkitemCallback, properties) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var uri = self.repo + "/oslc/contexts/" + paId + "/workitems?oslc_cm.query=";

        uri += encodeURIComponent(queryString);
        if (properties) {
            uri += "&oslc_cm.properties=" + encodeURIComponent(properties.join());
        }

        var wisHandled = 0;
        var resultGatherer;
        resultGatherer = function(err, resp, body) {
            if (err) {
                return reject(err);
            }
            
		    if (resp.statusCode != 200) {
		        console.log("status code " + resp.statusCode);
		        return reject("Error during login. Unexpected status code " + resp.statusCode + ".");
		    }
		
            
            var answer = JSON.parse(body);

            answer["oslc_cm:results"].forEach(perWorkitemCallback);
            wisHandled += answer["oslc_cm:results"].length;
            console.log("Handled " + wisHandled + " of " + answer["oslc_cm:totalCount"]);

            if (answer["oslc_cm:next"]) {
        		self.req.get(answer["oslc_cm:next"], {headers: {
                    'accept': 'application/json'
                }}, resultGatherer);
            }
            else {
                resolve();
            }
        };

		self.req.get(uri, {headers: {
            'accept': 'application/json'
        }}, resultGatherer);
    });
}

module.exports = WorkItems;
