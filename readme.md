## FlowChart

### What is FlowChart?

FlowChart is a powerful extension for [SillyTavern](https://docs.sillytavern.app/) that allows you to automate actions, create custom commands, and build complex logic using a visual, node-based editor. Instead of writing STScript, you connect blocks (nodes) together to create a "flow" that runs when certain events happen.

You can use it to:

*   Automatically react to messages (e.g., if the user says "remember this", create a lorebook entry).
*   Create complex, multi-step slash commands.
*   Modify chat messages on the fly.
*   Interact with an LLM for structured data extraction (e.g., "summarize the last 5 messages into bullet points").
*   Automate character and lorebook management.
*   Replace your STScript usage with a visual interface.

### Installation

Install via the SillyTavern extension installer:

```txt
https://github.com/bmen25124/SillyTavern-FlowChart
```

### Core Concepts

*   **Nodes:** These are the building blocks of your flow. Each node performs a specific action, like creating a string of text, sending a chat message, or checking a condition.
*   **Handles:** The small circles on the left and right of nodes are handles.
    *   **Left Handles (Inputs):** Receive data.
    *   **Right Handles (Outputs):** Send data out.
*   **Connections (Wires):** You drag a line from an output handle of one node to an input handle of another. This creates a connection, allowing data to "flow" from one node to the next.

#### Control Flow vs. Data Flow (`main` Handle)

A key concept is the difference between *Control Flow* and *Data Flow*.

*   **Data Flow:** When you connect a specific output like `value` or `result` to a specific input, you are sending a piece of data for the next node to *use*. For example, connecting a `String` node's `value` output to a `Log` node's `value` input tells the `Log` node *what* to print. These are **named handles**.
*   **Control Flow:** Sometimes, you just need to define the order of operations without passing specific data. This is done using the special `main` handle. Most nodes have a `main` input and a `main` output. Connecting `main` handles creates a sequence. The `main` channel also "passes through" whatever value it receives, allowing you to carry a result through a series of utility nodes.

Think of it this way: named handles are for *what* a node does, and the `main` handle is for *when* it does it.

### The Editor Interface

1.  **Flow Selector (Top Bar):** Manage your flows. You can create new flows, rename existing ones, or delete them.
2.  **Run Button:** Manually starts the current flow. This is great for testing. It will start from any "Manual Trigger" nodes you have.
3.  **Node Palette (Left Sidebar):** A list of all available nodes, grouped by category. Drag nodes from here onto the canvas. You can also use the search bar to find a specific node.
4.  **The Canvas (Main Area):** This is where you build your flow. You can drag nodes around, connect them, and right-click to bring up a context menu for duplicating, deleting, or adding new nodes.

### Node Reference

Here is a list of all available nodes and what they do.

#### **Trigger Nodes**

*   **Event Trigger:** Starts a flow when a specific SillyTavern event occurs (e.g., a user message is sent, a chat is changed). This is the primary way to automate things. For a full list of available events and their descriptions, see the [Event Documentation](EVENT_DOCUMENTATION.md).
*   **Manual Trigger:** Starts a flow only when you click the main "Run" button in the editor. Useful for testing.
*   **Slash Command:** Creates a new `/flow-` slash command that, when used in chat, will trigger this flow and pass arguments to it.

#### **Logic Nodes**

*   **If:** The most important logic node. It directs the flow based on one or more conditions. If a condition is true, the flow continues from that condition's output. If none are true, it continues from the "Else" output.
*   **End Flow:** Immediately stops the flow's execution at that point.

#### **Input Nodes**

*   **String:** Creates a simple piece of text.
*   **Number:** Creates a number.
*   **Boolean:** Creates a true/false value.
*   **Profile ID:** A dropdown to select one of your API Connection Profiles.

#### **Picker Nodes**

These are simple nodes that provide a dropdown menu to select a specific item, which can then be passed to other nodes.
*   **Pick Character:** Outputs the selected character's avatar filename.
*   **Pick Lorebook:** Outputs the selected lorebook's name.
*   **Pick Prompt:** Outputs the selected custom prompt's name.
*   **Pick Flow:** Outputs the selected flow's ID.
*   **Pick Regex Script:** Outputs the selected SillyTavern regex script's ID.
*   **Pick Math Operation:** Outputs the name of a math operation (add, subtract, etc.) for the `Math` node.
*   **Pick String Operation:** Outputs the name of a string operation for the `String Tools` node.
*   **Pick Prompt Mode:** Outputs a prompt engineering mode (native, json, xml) for the `LLM Request` node.
*   **Pick Random Mode:** Outputs a mode (number, array) for the `Random` node.
*   **Pick Regex Mode:** Outputs a mode (sillytavern, custom) for the `Regex` node.
*   **Pick Conversion Type:** Outputs a target type (string, number, etc.) for the `Type Converter` node.

#### **Chat Nodes**

*   **Send Chat Message:** Sends a new message to the current chat as the user, assistant, or system. This can be used to create a placeholder message (e.g., with `...` as content) to get a `messageId` for real-time streaming with the `LLM Request` node.
*   **Get Chat Message:** Retrieves the details of a specific message from the chat history (e.g., the very last message).
*   **Edit Chat Message:** Modifies the content of an existing message.
*   **Remove Chat Message:** Deletes a message from the chat history.
*   **Hide/Show Message (Context):** Hides or shows a message or range of messages from being included in the LLM's context. This does not affect the message's visibility in the chat UI.
*   **Get Chat Input:** Retrieves the current text from the main chat input field.
*   **Update Chat Input:** Sets the text in the main chat input field.

#### **API Request Nodes**

*   **Create Messages:** Gathers the current chat context (system prompt, character definitions, chat history) to prepare it for an LLM request.
*   **Custom Message:** Lets you build a list of messages from scratch, ignoring the current chat context.
*   **LLM Request:** Sends messages to an LLM and gets a response. Can be a simple text response or a structured JSON/XML response if a Schema is provided. Supports a **Stream** option for simple text to update a message in real-time.
*   **Merge Messages:** Combines multiple sets of messages into a single list.
*   **HTTP Request:** (Advanced) Make requests to any external API. Allows you to connect your flows to other web services.

#### **Character Nodes**

*   **Get Character:** Retrieves all information about a specific character.
*   **Create Character:** Creates a new character.
*   **Edit Character:** Modifies an existing character's details.

#### **Lorebook Nodes**

*   **Get Lorebook:** Retrieves all entries from a specified lorebook.
*   **Get Lorebook Entry:** Retrieves a single entry from a lorebook.
*   **Create Lorebook:** Creates a new, empty lorebook.
*   **Create Lorebook Entry:** Adds a new entry to a lorebook.
*   **Edit Lorebook Entry:** Modifies an existing lorebook entry.

#### **JSON & Schema Nodes**

*   **JSON:** A visual editor to construct a JSON object. Each key in the object gets its own output handle.
*   **Schema:** A visual editor to define the *structure* of data you expect from an LLM. You connect this to an "LLM Request" node to force the AI to respond in a specific format.

#### **Utility Nodes**

*   **Log:** Prints any data connected to it into your browser's developer console (F12). Essential for debugging.
*   **Set Variable / Get Variable:** Allows you to store a piece of data in a temporary variable and retrieve it later in the flow.
*   **Get Property:** Pulls a specific piece of data out of an object (e.g., getting the `name` from a character object).
*   **Math:** Performs basic arithmetic operations (add, subtract, etc.).
*   **String Tools:** Manipulate text. Includes `toUpperCase`, `toLowerCase`, `trim`, `replace`, `slice`, `length`, `startsWith`, `endsWith`, and more.
*   **Handlebar:** A powerful templating tool. You can create a template like "Hello, {{name}}!" and provide data to fill it in.
*   **Date/Time:** Gets the current date and time in various formats.
*   **Random:** Generates a random number in a range or picks a random item from a list.
*   **Regex:** Apply a regular expression to find/replace text. Can use SillyTavern's built-in regex scripts or a custom one.
*   **Run Slash Command:** Executes any built-in SillyTavern slash command.
*   **Run Flow:** Triggers another one of your flows. This is great for creating reusable logic.
*   **Type Converter:** Converts data from one type to another (e.g., a string of text to a number).
*   **Execute JS Code:** **(Advanced & Dangerous)** Runs arbitrary JavaScript code. A permission toggle on the flow is required to use this node. Only use it if you understand the code you are writing or pasting.
*   **Merge Objects:** Combines multiple objects into a single one. If keys conflict, the object connected to a higher-numbered input wins.
*   **Notification:** Displays a toast notification in the SillyTavern UI (info, success, warning, error).
*   **Prompt User:** Shows a popup to get text input from the user during a flow run.
*   **Confirm With User:** Shows a popup with "OK/Cancel" to get a yes/no confirmation from the user.

### Simple Example: Reacting to a Keyword

Let's create a simple flow where the character says "Ouch!" whenever the user's message contains the word "poke".

**Diagram:**
`[Event Trigger]` -> `[Get Chat Message]` -> `[If]` -> `[Send Chat Message]`

**Steps:**

1.  **Drag an "Event Trigger" node.** Set its "Event" dropdown to `user_message_rendered`. This node will start the flow every time you send a message. It outputs the `messageId` of your new message.
2.  **Drag a "Get Chat Message" node.** Connect the `messageId` output from the trigger to the `messageId` input of this node. This will fetch the content of the message you just sent.
3.  **Drag an "If" node.** Connect the `mes` (message content) output from "Get Chat Message" to the **"Input Value"** input handle of the "If" node.
4.  **Configure the "If" node.**
    *   Set the operator dropdown to `contains`.
    *   In the value box, type `poke`.
5.  **Drag a "Send Chat Message" node.** In its "Message Content" box, type `Ouch!`.
6.  **Connect the flow.** Drag a wire from the "True" output of the "If" node to the `main` input of the "Send Chat Message" node.

That's it! Now, any time you send a message containing "poke", the character will automatically respond with "Ouch!".
