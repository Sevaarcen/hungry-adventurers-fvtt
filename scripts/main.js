console.log("Hello Hungry Adventurers! This code runs immediately when the file is loaded.");

Hooks.on("init", function() {
  console.log("Hungry Adventurers -- This code runs once the Foundry VTT software begins its initialization workflow.");
});

Hooks.on("ready", function() {
  console.log("Hungry Adventurers -- This code runs once core initialization is ready and game data is available.");
});

Hooks.on(SimpleCalendar.Hooks.DateTimeChange, (data) => {
    console.log("Hungry Adventurers caught a datetime change");
    console.log(data);
    console.log(data.diff)
 });