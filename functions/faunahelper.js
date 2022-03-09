

const faunaExistsHelper = async (client, q, collection, id)  => {	

  return await client.query(
    q.Exists(
      q.Ref(q.Collection(collection), id)
    )
  );
}

const faunaGetHelper = async (client, q, collection, id) => {
  return await client.query(
    q.Get(
      q.Ref(q.Collection(collection), id)
    )
  );
}


const faunaUpdateHelper = async (client, q, collection, id, data) => {
  return await client.query(
	  q.Update(
	  	q.Ref(q.Collection(collection), id), {data: data }
	  )
  );
}

const faunaCreateHelper = async (client, q, collection, id, data) => {
  return await client.query(
	  q.Create(
	  	q.Ref(q.Collection(collection), id), {data: data }
	  )
  );
}

const faunaUpdateOrCreate = async (client, q, collection, id, data) => {


  const exists = await faunaExistsHelper(client, q, collection, id);

  if (exists === true) {
    return await faunaUpdateHelper(client, q, collection, id, data);
  }

  if (exists === false) {
  	return await faunaCreateHelper(client, q, collection, id, data);
  }

}

module.exports = {
	create: 		faunaCreateHelper,
	get: 			faunaGetHelper,
	exists: 		faunaExistsHelper,
	update: 		faunaUpdateHelper,
	updateOrCreate: faunaUpdateOrCreate,
}