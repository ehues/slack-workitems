# slack-workitems

A slack bot that displays a work item summary when it's mentioned in a channel. 

![Sample mention](images/sample-mention.png)

# Configuration

Set the following environment variables

`RTC_REPO` - URI of the RTC repository. 

`RTC_USER` - Username of the RTC user to log-in as.

`RTC_PASS` - Password of the RTC user to log-in as.

`RTC_BOT_TOKEN` - Bot token for Slack. Go to https://<your-team>.slack.com/services/new/bot, and add a bot. 
```
    xoxb-4012132863-hv5aqYGYCPa153c08vRUhz77
```

`RTC_WEBHOOK` - Webhook to publish attachments into Slack. Go to https://<your-team>.slack.com/services/new/incoming-webhook, and add get the last three segments of the path specified in the hook.
```
    T03SYNZBC/A040C4EKP/AFJkBIW8DRDbOsgVStITd9no
```

`RTC_TEAM` - Name of the team you are connecting to (e.g. https://<your-team>.slack.com)


Optional

`RTC_URI_OVERRIDE` - URI to be used in place of the work item's preferred URI. The string variable '{0}' will be replaced with the work item number. e.g:

```
    https://jazz.net/jazz/web/projects/Rational%20Team%20Concert#action=com.ibm.team.workitem.viewWorkItem&id={0}
```

# See also

[RTC-Slackbot](https://github.com/jroyal/RTC-Slackbot) - A python-based slackbot that provides user, work item, and backlog lookup.
