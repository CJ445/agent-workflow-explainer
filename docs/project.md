flow:
Phase 1: Chat Trigger + AI Agent + Gemini + system prompt
---
stage 1 (env setup):
---
1. n8n cloud login
- url: https://app.n8n.cloud/login
- n8n, click start a free trail
- then enter mail id
- enter verification code from mail inbox
- enter name, password, instance name(can be anything, name itself)
- now to fill the form:
-- only me
-- engineering
-- Event
-- not yet
-- none of the above
-- claude
-- then submit
- click the orange button start automating and wait as it loads
- in the top left panel, click the plus + button and then click new workflow and wait while it loads

2. Google Gemini Api
- url: https://aistudio.google.com/api-keys
- go to link and wait for it to onboard you if your a new user, check box the first box and then click continue and then click skip.
- now in the top right corner, you have create api key, click that, name as default Gemini Api Key and then choose imported project also default gemini project and then click generate api key.
- after you get the key, copy the key and paste it in a notepad, so that we can use that later.
**Stage 2 (Building Prototype):
Chat Trigger:**
in your n8n, now click the + button (add your first step)
in the search bar, search for chat trigger, you will find chat
click that, then click on new chat event under trigger section
and then you can close the chat trigger popup.
2. AI Orchestrator
now click the plus button + (which is in the right side of chat trigger)
now search for ai agent
click on the ai agent and then it will open configurations for it
now first change the source for prompt to define below
then define by:
``` 
{{ $json.chatInput }} 
```
then scroll down below and click add options
add system message, and paste the below
``` 
You are a friendly board assistant for the Matrix AI/ML community.

Answer clearly and briefly. If you don't know something, say so instead of guessing.

All times are in IST (Asia/Kolkata).
```
then you can close the ai agent by clicking the x button on top right
3. Chat Model
In the Ai Agent, we have chat model + button in the bottom side, click that
search or click on google gemini chat model
now click on credentials dropdown and then click create new credential
then paste the gemini api key which we created and click save
click on models and then search gemini 3.1 flash lite and select that
scroll down and click add options and add sampling temperature
change the sampling temperature to 0.2
then close the gemini chat model
Stage 3 (Testing)
click on the thunder symbol next to chat trigger  (open chat)
just say hi and you can see the automation working
if you get the ouput, then you have successfully built an ai agent chatbot.

**Phase 2 (Memory + Testing)
Stage 1: Memory**
In the bottom of the AI Agent, we have an option to add memory, click that
search simple memory and add that(click on that)
close the simple memory
Stage 2: Testing
clear the session the in chat box
type Hi, i am name
next ask what is my name.
...................................................
Phase 3 (Google Sheets - Data)
Stage 1: Google Sheets
open a new tab in chrome
search for or open google sheets
-- sign in google sheets
-- name the sheet name as Members List
-- create two colums, one as Name, another as Email
-- enter your name and your email (Enter another Mail)
now go to the n8n tab
- click on the +plus button below the ai agent which is tool
search for google sheets and click that
- first rename the tool with get_board_members (top left corner, just click on the name and remove that and name it with this)
then click google sign in and sign in with your account
- select all (select the checkbox)
-- tool description: set manually
-- description
```
list the board members
```
-- rest all same till document
-- in document field, click on choose and select the sheet what you created (Members List)
-- then in sheets also select sheet 1
-- now close the google sheets

Stage 2: (Testing)
now open the chat and ask
```
List the board members
```
.............................................

Phase 4 (Gmail)
Stage 1: (Gmail)
now click the plus+ button on the ai agent to add another tool
first rename the tool with send_board_email (top left corner, just click on the name and remove that and name it with this)
search gmail tool and click on that
- then sign in with google and sign in (if it says google or if it says gmail account, then leave it, as its already signed in)
-- tool description: set manually
-- description:
```
Send an email. Only call this AFTER the user has explicitly approved the draft in chat. Never call this automatically.
```
-- scroll down and for both to and subject and message: click the star button so that it will say defined by the agent
-- scroll down and add option and add sender name
-- sender name: Executive Agent
-- add another option, append n8n attribute and then uncheck the toggle as we dont want that.
now close the gmail tab.
Stage 2: (Testing)
- now open the chat box and then ask it to:
```
inform the board we have a board meeting tomorrow at 5pm
```
then dont send yet, instead tell it:
```
change the duration to 30min, 5pm onwards and then venue is AI201
```
then say:
```
now send the mail
```
You have successfully built your first Mail Automation AI Agent
