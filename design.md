# Story Engine

Story engine is a comprehensive system for creating LLM-controlled narratives. At a high level, it is an iterative solver that elaborates on, expands, and contracts a narrative in real time as the player traverses the story. 

## Generation

The initial creating of a story will be done using a short setting prompt, e.g. "detective story set in the 1920s about solving a break in at a cheese store." A couple components are then generated by the story engine in sequence:

- **Setting:** Basic information about the world: when/where is it set? is it a fantasy environment? what kind of people are going to populate this environment?

- **protagonist:** The protagonist will always be left fairly amorphous such that it can react to player input and decisions, but attributes such as the players career, role in the story, initial situation and place in life are essential details to assign before the story can begin.

- **plot:** the general arc of what happens in the story. This incldues a concretely planned beginning, middle, and end. In our above example, this would set up in broad strokes how the detective will begin investigating, what the nature of the crime was, who was behind it, some ways they might come to solve the  mystery, and what could happen when they do (along with any other threads that might need to be resolved).

- **cast:** The cast of characters is in many ways the meat of the generated world. Based on the plot and setting, the story engine constructs a plausible cast of characters the player can meet. This isn't set in stone and will be changed constantly throughout the story, but is a starting point for the set of characters (for example, we might generate a cheesemonger for the player to interview, but when the player asks about the patrons at the store, the story engine will modify the cast on the fly to add some patrons the player can interview also).

### Character model

Each generated member of the cast has the following data, generated initially and then kept updated by the story engine at every step.

- Biography: essential details (e.g. "24yo man, works as assistant at chese store)

- location: where will the player find this character (where can the player to go speak to them?)

- Motivations: What do they want in relation to the plot? Do they have any specific goals or plans?

- Plot actions: Are there any specific things they'll do as the story progresses, or things that will happen to them? These are concretely defined via triggers. E.g. ("if the character finds out that the player has broken their window, the character will move away to the countryside"). These can also be time based, such as an event that occurs after 2 days of game time.

- Knowledge: what do they know about other characters, or the setting and world in general?

- Relationships: for every other character in the cast, describes their relationship, opinions of each other, etc. (or none if they don't know each other).

- Overview: Summary of all this information, for easy insertion into story solver LLM context windows

Each of these sections will be represented as a list of concrete and specific statements about the character and how they might behave.

## Locking

Every single statement in the story engine is marked as either "locked" or "unlocked". Essentially, the story is dynamic and should change as much as is needed to maintain a compelling world in response to new information. However the world should also be consistent from a player viewpoint: anything the player encounters in any way can no longer be changed. So at any point when information is revealed to a player, that statement becomes "locked" and the solver can no longer edit it. Instead, it becomes a constraint for the solver to work around as it modifies the story.

## Updates

We can imagine each "step" of the story as whenever the player takes an action that concerns the story. In the visual novel context, this is any time the player selects any dialogue option. At this point, a few things happen:

- Any new information (about the player, other character's opinions about the player, things each character knows) is propagated and included in the story representation and listed under each relevant character. This is done through LLM queries to determine which statements affect which characters, and if a player action concerns any relevant story points.

- After that update, the "story solver" process occurs. 

The story solver is essentially the process of loading all the relevant story context into an LLM and asking "does this narrative still make sense and does it still have a compelling narrative arc." If so, nothing happens. If not (e.g. a contradiction was created somewhere), then the story is iteratively modified until the story makes sense again. The solver is also run locally for every single character, checking if their motivations, biography, etc. make sense, and if there are any actions they will personally want to take in response to the new state of the story.

Actions the solver might take are:

- Creating a new character to fill in an area of narrative

- Deleting a character who the player hasn't met yet if they become no longer relevant to the direction of the story

- Updating the backstory or motivation of a character to fit into the new story direction

- Changing future plot events to align with what a character has told the player

And of course after each of these actions, the solver is re-run, to ensure the new state is "solved" and taking any additional secondary actions needed. This allows for cascades of narrative edits, where e.g. a new character is created, then due to that an existing character's relationships are upated to involve the new character, and then due to that some other plot element changes to be more exciting, and so forth.

Concrete solver passes (in excecution order):
- locking solver: decide which plot or character statements need to become locked, focusing in particular on the character currently interacting with the player
- current character solver: integrate any updates into the characters profile - opinions of the player, things they know (maybe the player told them something), goals and desires
- Overall plot solver: does the change to that character indicate a change to the world at large should be made?
- solver for each character based on plot (update motivation, backstory, etc.)
- cast solver (add/remove characters if needed)
- Check plot triggers against world state: if new events have activated any triggers, process those updates. (this step can happen intermittently, such as only at the end of each conversation)

## Dialogue generation

The substance of how the story is revealed to the player is generally a character saying something to player. The story engine implements this via a LLM for that character with context on their beliefs, motivations, and personality. When a piece of dialogue is generated, it is first passed to the story solver to check consistency with the world state, ensure it wouldn't cause any unwanted changes to the plot, and maintains consistency. If that's the case, the dialogue can be outputted, otherwise it may be changed with input from the solver.

### Creating a new character

The process of creating a new character goes as follows:

- The cast solver LLM describes the need for a new character (e.g. "the cheesemongers assistant described having a wife who helps around the shop. the wife should have witnessed something tangentially related to the crime").

- This need statement is passed to the character creation agent, which recieves this statement along with an overview of the entire cast, setting, and plot to inform the new character.

- based on this info, a character profile is generated (see the listed info under the "character model" section)

- lastly, the story solver overall is run to integrate the character into the cast, with all existing cast members updating their relationships to the new character and each other if necessary.

## Implementation

For the initial prototype, we will be creating a web visual novel system, where the player can speak to a cast of characters, selecting generated dialogue options, to traverse the story as it reacts to the players decisions.

The story solver should be implented separately, as agnostically as possible from the frontend, so that it can be used as a general engine in any number of setups.

### Technical details

Create a react typescript web app for the visual novel frontend, along with a server that handles story engine updates and responses.

The story engine should be implemented serverside via openai api.

The server should store session information for each client containing the story they are currently playing. It should also handle AI image generation, creating stylized character portraits whenever a character is generated to display the character on the frontend.

At each step the game code should query the story engine for dialogue options for the player, along with the current characters response at each step.

### Visual novel frontend

THe visual novel frontend should display the player and other character portraits in standard visual novel style, allowing the player to select between dialogue options. At the end of each conversation, the player should be able to select a new character to speak to, or a new location to visit, at which point a relevant character from the cast is found, or a new one is generated if they go to a location without any existing characters.