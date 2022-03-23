'use strict';

// let map, mapEvent;

class Workout {
  date = new Date();
  id = this.#generateId();
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in minutes
  }

  #generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // Protected
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    // Get user's position
    this.#getPosition();

    // Get data from local storage
    this.#getLocalStorage();

    form.addEventListener('submit', this.#newWorkout.bind(this));

    // Changing type
    inputType.addEventListener('change', this.#toggleElevationField);

    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
  }

  #getPosition() {
    // Check so we don't get errors in old browsers
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert('Could not get position');
        }
      );
    }
  }

  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // Displaying a Map Using Leaflet Library
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map and displaying a Map Marker
    this.#map.on('click', this.#showForm.bind(this));

    this.#workouts.forEach(work => this.#renderWorkoutMarker(work));
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    // Helper function to check for valid inputs
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => Number(inp) > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const { lat, lng } = this.#mapEvent.latlng; // coords
    let workout;

    // if workout running, create running object
    if (type === 'running') {
      const cadence = Number(inputCadence.value);

      // Check if data is valid
      if (
        !validInput(cadence, distance, duration) ||
        !allPositive(cadence, distance, duration)
      ) {
        return alert('Inputs have to be positive numbers');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);

      // Check if data is valid
      if (
        !validInput(elevation, distance, duration) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers');
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    // Render workout on map as marker
    this.#renderWorkoutMarker(workout);

    // Render workout on list
    this.#renderWorkout(workout);

    // Hide form + Clear input fields
    this.#hideForm();

    // Set local storage to all workouts
    this.#setLocalStorage();
  }

  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">5.2</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    }

    if (workout.type === 'cycling') {
      html += ` <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  #moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => this.#renderWorkout(work));
  }

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Deleting data
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

/**
 * Using the Geolocation API
 * The function takes 2 callback function as an input
 * navigator.geolocation.getCurrentPosition(callback function called on a success, error callback function)
 */

/**
 * Displaying a Map Using Leaflet Library
 * Place the API's CDN at the HTML's head and before you own javascript tag
 * And remember to specify the defer attribute to the <script> tag if the order matters
 * Any variable that's global in any script will be available to all the other scripts as long as it appears
 * after the main script
 * See line 26 - 36 for implementation
 */

/**
 * Displaying a Map Marker
 * .on() is coming from the leaflet library
 * There is a lot of things you can do with the pop up in leaflet
 */

/**
 * Rendering Workout Input Form
 * Use the submit event to capture the enter key
 */

/**
 * Project Architecture
 * We will make four classes
 *  1) Class Workout
 *      2) Child Class Running
 *      3) Child Class Cycling
 *  4) Class App
 * Having a class that contains all data and methods about the application is a pretty common theme you will
 * see in simple javascript application.
 * Ofcourse, with a big application, it will be better to have multiple classes
 */

/**
 * Refactoring for Project Architecture
 * An object of options is quite common in third party libraries.
 * The constructor method is called immediately when a new object is created from said class.
 * In a regular function call, the 'this' keyword is set to undefined.
 */

/**
 * Managing Workout Data: Creating Classes
 * In the real world, we usually use some kind of library in order to create good and unique id numbers
 * But this time we will use the current date, convert it to a string and use the last 10 numbers for the id.
 */

/**
 * Creating a New Workout
 * Input validation is an important part of creating any application that works with user input
 * The if else statement is not that much used anymore in modern JS. These days, the double if statements are
 * used more often.
 * Modern JS also uses guard clauses
 * .every() will loop over the array and will only return true if all the elements in the array satisfy the condition.
 * It is a good habit to get used in creating small helper functions. They are especially nice in these situations for
 *  testing complex situations.
 */

/**
 * Rendering Workouts
 * 'afterend' will add the new element as a sibling element at the end of the form
 */

/**
 * Move to Marker on Click
 * Use the .setView(coords, zoom level, optional object of options) method to move to a particular marker
 * Read documentation of leaflet to see how methods work.
 */

/**
 * Working with localStorage
 * Local storage is basically a place in the browser where we can store data that will persist even after
 *  we close the page.
 * localStorage.setItem(key, value) is an API that the browser provides for us that we can use.
 *  It's a key value storage
 * JSON.stringify(object) will convert the object into a string
 * Keep in mind that localStorage is a very simple API and so it is only advised to use for small amounts of data.
 * You shouldn't use localStorage to store large amount of data since it will slow down your application.
 * We can set multiple items in the local storage
 * When converting an object to a string and then back from the string to objects, you will lose the prototype chain.
 *  So the objects that you recovered from the local storage are now regular objects and therefore they will not be able
 *  to inherit methods that they previously were able to inherit.
 *  This can be a big problem when you're working with local storage and OOP like what you're doing here.
 * location is a big object that contains a lot of methods and properties in the browser and one of the methods is the
 *  ability to reload the page.
 */

/**
 * Final Considerations
 * Watch lecture to see ideas for extending the project's abilities
 */
