# Running the Test Application

On two separate terminal instances from this directory, run:

```
npx http-server -p 5000 -c-1
```

and then

```
npx openfin-cli -l -c http://localhost:5000/app.json
```

When the application is running, you can open either sample workbook included in the folder which demonstrates basic UDF and VBA interactivity.


## Initial Summary of Available UDFs

```
=SubscribeJsonMessage(senderUuid, sourceName, topic)
```
For all UUIDs use `"*"`, for all windows within a given UUID, use `""`.


```
=SubscribeJsonDataH(headerCells, senderUuid, sourceName, topic)
```
Subscribes to real-time data fields from the InterApplicationBus on the specified topic from the specified application and window using the given header cells defined horizontally.

```
=SubscribeJsonDataV(headerCells, senderUuid, sourceName, topic)
```
Subscribes to real-time data fields from the InterApplicationBus on the specified topic from the specified application and window using the given header cells defined vertically.

```
=PublishValue(topic, value)
```
Publishes a cell value or range of values over InterApplicationBus on the specified topic.

```
=SendValue(topic, value)
```
Sends a cell value or range of values to a specified OpenFin Application or Window on the specified topic.

## Intial Summary of VBA Functionality

_TODO_