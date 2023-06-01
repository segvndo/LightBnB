const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {console.log(response)});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `
  SELECT *
  FROM users
  WHERE email = $1`;

  return pool
    .query(queryString, [email])
    .then(result => result.rows[0] || null)
    .catch(err => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `
  SELECT *
  FROM users
  WHERE id = $1`;

  return pool
    .query(queryString, [id])
    .then(result => result.rows[0] || null)
    .catch(err => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const {name, email, password} = user;
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1,$2,$3)
  RETURNING *;`;

  return pool
    .query(queryString, [name, email, password])
    .then(result => result.rows[0])
    .catch(err => {
      console.log(err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
    SELECT properties.*, reservations.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN reservations ON properties.id = reservations.property_id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id= $1 AND reservations.start_date > Now()::date
    GROUP BY properties.id, reservations.id
    ORDER BY start_date
    LIMIT $2`;
  
    return pool
      .query(queryString, [guest_id, limit])
      .then(result => result.rows)
      .catch(err => {
        console.log(err.message);
      });
};


/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {
  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    !queryParams.length ? (queryString += `WHERE `) : (queryString += `AND`);

    queryParams.push(`%${options.city}%`);
    queryString += `city iLIKE $${queryParams.length} `;
  }

  // if an owner_id is passed in, only return properties belonging to that owner
  if (options.owner_id) {
    !queryParams.length ? (queryString += `WHERE `) : (queryString += `AND`);

    queryParams.push(options.owner_id);
    queryString += `owner_id = $${queryParams.length} `;
  }

  //if a minimum_price_per_night and a maximum_price_per_night, only return properties within that price range
  // if minimum_price_per_night has a value. If it does, it adds a WHERE or AND clause to the query string depending on whether there are any previous query parameters
  //also pushes wavlue of options.minimum_price_per_night multiplied by 100 to the queryParams array and adds a condition to the query string that limits the cost_per_night to be greater than or equal to the value of options_minimum_price_per_night
  if (options.minimum_price_per_night) {
    !queryParams.length ? (queryString += `WHERE `) : (queryString += `AND`);

    queryParams.push(options.minimum_price_per_night * 100);

    queryString += `cost_per_night >= $${queryParams.length} `;
  }

  //if maximum_price_per_night has a value. If it does, it adds a WHERE or AND clause to the query string depending on whether there are any previous query parameters
  //also pushes wavlue of options.maximum_price_per_night multiplied by 100 to the queryParams array and adds a condition to the query string that limits the cost_per_night to be less than or equal to the value of options_maximum_price_per_night
  if (options.maximum_price_per_night) {
    !queryParams.length ? (queryString += `WHERE `) : (queryString += `AND`);
    queryParams.push(options.maximum_price_per_night * 100);

    queryString += `cost_per_night <= $${queryParams.length} `;
  }


  queryString += `GROUP BY properties.id`;

//if a minimum_rating is passed in, only return properties with an average rating equal to or higher than that
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += ` HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams).then(res => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
 
  const queryParams = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
  ];

  const queryString = `
  INSERT INTO properties (owner_id,title,description,thumbnail_photo_url,cover_photo_url,cost_per_night,street,city,province,post_code,country,parking_spaces,number_of_bathrooms,number_of_bedrooms)
  VALUES($3, $6, $9, $12, $15, $18, $21, $24, $27, $30, $33, $36, $39)
  RETURNING *;`;

  return pool
      .query(queryString, queryParams)
      .then(result => result.rows)
      .catch(err => {
        console.log(err.message);
      });

};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};


// When you add a new property to the database, it will not appear in the My Listings area of your application because it does not have a review or an average rating.

// Therefore, to validate your output, just check that the property has been added by querying the database directly in PostgreSQL.