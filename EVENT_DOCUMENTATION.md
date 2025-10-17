# Flowchart Event Documentation

This document lists all the events available in SillyTavern that can be used to trigger a flow.

## Core Messaging Events

-   **MESSAGE_RECEIVED**: Emitted when a new message is received/inserted into chat.
-   **CHARACTER_MESSAGE_RENDERED**: Emitted after a character message is rendered in the UI.
-   **MESSAGE_SENT**: Emitted when a user sends a message.
-   **USER_MESSAGE_RENDERED**: Emitted after a user message is rendered in the UI.
-   **MESSAGE_EDITED**: Emitted when a message is edited.
-   **MESSAGE_DELETED**: Emitted when a message is deleted.
-   **MESSAGE_UPDATED**: Emitted when a message is updated.
-   **MESSAGE_SWIPED**: Emitted when a message is swiped.
-   **MESSAGE_SWIPE_DELETED**: Emitted when a message swipe is deleted.
-   **MORE_MESSAGES_LOADED**: Emitted when more messages are loaded (e.g., by scrolling up).
-   **IMPERSONATE_READY**: Emitted when an impersonation message is ready to be sent.
-   **MESSAGE_FILE_EMBEDDED**: Emitted when a file is embedded in a message.
-   **MESSAGE_REASONING_EDITED**: Emitted when a message's reasoning (metadata) is edited.
-   **MESSAGE_REASONING_DELETED**: Emitted when a message's reasoning (metadata) is deleted.

## Chat/Group Management Events

-   **CHAT_CHANGED**: Emitted when the current chat changes.
-   **CHAT_DELETED**: Emitted when a chat is deleted.
-   **CHAT_CREATED**: Emitted when a chat is created.
-   **GROUP_CHAT_DELETED**: Emitted when a group chat is deleted.
-   **GROUP_CHAT_CREATED**: Emitted when a new group chat is created.
-   **GROUP_UPDATED**: Emitted when group information is updated.
-   **GROUP_MEMBER_DRAFTED**: Emitted when a group member is drafted.
-   **GROUP_WRAPPER_STARTED**: Emitted when a group message generation process starts.
-   **GROUP_WRAPPER_FINISHED**: Emitted when a group message generation process finishes.

## Preset Management Events

-   **PRESET_CHANGED**: Emitted when a generation preset is changed for an API.
-   **PRESET_DELETED**: Emitted when a generation preset is deleted.
-   **PRESET_RENAMED**: Emitted after a generation preset is renamed.

## World Info Events

-   **WORLDINFO_SETTINGS_UPDATED**: Emitted when world info settings are updated.
-   **WORLDINFO_UPDATED**: Emitted when world info entries are updated.
-   **WORLD_INFO_ACTIVATED**: Emitted when world info entries are activated for context.
-   **WORLDINFO_FORCE_ACTIVATE**: Emitted to force world info activation.
-   **WORLDINFO_ENTRIES_LOADED**: Emitted when world info entries are loaded.

## API/Model Events

-   **CHATCOMPLETION_SOURCE_CHANGED**: Emitted when the chat completion source (API provider) changes.
-   **CHATCOMPLETION_MODEL_CHANGED**: Emitted when the chat completion model changes.

## Extension Events

-   **EXTENSIONS_FIRST_LOAD**: Emitted on the first load of extensions after the UI is ready.
-   **EXTRAS_CONNECTED**: Emitted when extras modules (like TTS, STT) are connected.
-   **EXTENSION_SETTINGS_LOADED**: Emitted when extension settings are loaded from the server.

## UI Rendering Events

-   **APP_READY**: Emitted when the main application UI is ready.
-   **FORCE_SET_BACKGROUND**: Emitted to force a background update.
-   **MOVABLE_PANELS_RESET**: Emitted to reset the positions of movable UI panels.

## Generation/Streaming Events

-   **GENERATION_STARTED**: Emitted when a new message generation starts.
-   **GENERATION_STOPPED**: Emitted when a generation is manually stopped by the user.
-   **GENERATION_ENDED**: Emitted when a generation finishes successfully.
-   **GENERATION_AFTER_COMMANDS**: Emitted after slash commands in a message are processed, but before generation.
-   **SD_PROMPT_PROCESSING**: Emitted during Stable Diffusion prompt processing.
-   **STREAM_TOKEN_RECEIVED**: Emitted for each token received during a streaming generation.

## Character Management Events

-   **CHARACTER_EDITOR_OPENED**: Emitted when the character editor is opened.
-   **CHARACTER_EDITED**: Emitted when a character's data is saved.
-   **CHARACTER_PAGE_LOADED**: Emitted when the character management page is loaded.
-   **CHARACTER_DELETED**: Emitted when a character is deleted.
-   **CHARACTER_DUPLICATED**: Emitted when a character is duplicated.
-   **CHARACTER_RENAMED**: Emitted when a character is renamed.
-   **CHARACTER_RENAMED_IN_PAST_CHAT**: Emitted when a character rename affects past chats.
-   **CHARACTER_FIRST_MESSAGE_SELECTED**: Emitted when a character's greeting (first message) is selected.
-   **OPEN_CHARACTER_LIBRARY**: Emitted when the character library is opened.

## Settings Events

-   **SETTINGS_LOADED**: Emitted when global settings are loaded.
-   **SETTINGS_UPDATED**: Emitted when global settings are updated.

## Connection Profile Events

-   **CONNECTION_PROFILE_LOADED**: Emitted when a connection profile is loaded.
-   **CONNECTION_PROFILE_CREATED**: Emitted when a new connection profile is created.
-   **CONNECTION_PROFILE_DELETED**: Emitted when a connection profile is deleted.
-   **CONNECTION_PROFILE_UPDATED**: Emitted when a connection profile is updated.

## Tool Calling Events

-   **TOOL_CALLS_PERFORMED**: Emitted when tool calls are performed.
-   **TOOL_CALLS_RENDERED**: Emitted when tool calls are rendered in the UI.

## API Events

-   **MAIN_API_CHANGED**: Emitted when the main API provider changes.

## Online Status Events

-   **ONLINE_STATUS_CHANGED**: Emitted when the application's online status changes.

## Image Events

-   **IMAGE_SWIPED**: Emitted when an image is swiped within a message.
