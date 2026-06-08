import { useRef, useEffect, useState } from "react";
import mapboxgl, { GeoJSONSource } from "mapbox-gl";
import { SearchBox } from "@mapbox/search-js-react";
import fireIcon from "./assets/fire.webp";
import fireGreyIcon from "./assets/fireGrey.webp";
import planeIcon from "./assets/plane.png";
import helicopterIcon from "./assets/helicopter.png";
import type { FeatureCollection } from "geojson";
import { renderToString } from "react-dom/server";

import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const center: [number, number] = [-104.9888567141373, 39.73923582717103];

function App() {
  const mapRef = useRef<mapboxgl.Map | undefined>(undefined);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const fireSourceId = "fires-data-source";
  const aircraftSourceId = "aircraft-data-source";

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      accessToken,
      style: "mapbox://styles/mapbox/standard",
      container: mapContainerRef.current!,
      center,
      zoom: 10,
    });

    const map = mapRef.current
    if (map) {
      map.on("load", async () => {
        map.addSource(fireSourceId, {
          type: "geojson",
          data: "/api/fire/GeoJsonList?inactive=true",
        });

        const loadMapImage = (url: string, id: string) =>
          new Promise<void>((resolve, reject) => {
            map.loadImage(url, (error, image) => {
              if (error) reject(error);
              else {
                map.addImage(id, image!);
                resolve();
              }
            });
          });

        await Promise.all([
          loadMapImage(fireIcon, "fireIcon"),
          loadMapImage(fireGreyIcon, "fireGreyIcon"),
          loadMapImage(planeIcon, "planeIcon"),
          loadMapImage(helicopterIcon, "helicopterIcon"),
        ]);

        map.addLayer({
          id: "fires-layer",
          type: "symbol",
          source: fireSourceId,
          layout: {
            // If a fire is not active, make it grey
            "icon-image": [
              "case",
              ["get", "IsActive"],
              "fireIcon",
              "fireGreyIcon",
            ],
            "icon-size": 1,
            "icon-allow-overlap": true,
            "symbol-sort-key": ["to-number", ["get", "IsActive"]], // Active fires appear on top
          },
        });

        getAircraft().then((aircraftData: FeatureCollection | undefined) => {
          if (aircraftData) {
            map.addSource(aircraftSourceId, {
              type: "geojson",
              data: aircraftData,
            });

            map.addLayer({
              id: "aircraft-layer",
              type: "symbol",
              source: aircraftSourceId,
              layout: {
                "icon-image": [
                  "match",
                  ["get", "aircraftFunction"],
                  "Helicopter",
                  "helicopterIcon",
                  "planeIcon",
                ],
                "icon-size": 1,
                "icon-allow-overlap": true,
                "icon-rotate": ["get", "heading"],
              },
            });
          }
        });

        setInterval(() => {
          getAircraft().then((aircraftData: FeatureCollection | undefined) => {
            if (aircraftData) {
              const source = map.getSource(
                aircraftSourceId,
              ) as GeoJSONSource;
              source.setData(aircraftData);
            }
          });
        }, 5000);

        map.fitBounds(
          [
            [-124.88, 32.39],
            [-114.05, 41.97],
          ],
          {
            padding: 50,
            animate: true,
          },
        );
      });

      map.on("click", "fires-layer", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["fires-layer"],
        });

        console.log("features[0]", features[0]);

        let coordinates: GeoJSON.Position = [0, 0];
        if (features.length > 0) {
          coordinates = (features[0].geometry as GeoJSON.Point).coordinates;
          console.log("Symbol Coordinates:", coordinates);
        }

        new mapboxgl.Popup()
          .setLngLat([coordinates[0], coordinates[1]])
          .setHTML(renderToString(fireInfoView(features[0])))
          .addTo(map);
      });

      map.on("click", "aircraft-layer", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["aircraft-layer"],
        });

        console.log("features[0]", features[0]);

        let coordinates: GeoJSON.Position = [0, 0];
        if (features.length > 0) {
          coordinates = (features[0].geometry as GeoJSON.Point).coordinates;
          console.log("Symbol Coordinates:", coordinates);
        }

        new mapboxgl.Popup()
          .setLngLat([coordinates[0], coordinates[1]])
          .setHTML(renderToString(aircraftInfoView(features[0])))
          .addTo(map);
      });

      map.on("click", (e) => {
        console.log("Click at:", e.lngLat);
      });
    }

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  return (
    <>
      <div
        style={{
          margin: "10px 10px 0 0",
          width: 300,
          right: 0,
          top: 0,
          position: "absolute",
          zIndex: 10,
        }}
      >
        <SearchBox
          accessToken={accessToken}
          map={mapRef.current}
          mapboxgl={mapboxgl}
          value={inputValue}
          options={{
            proximity: center,
          }}
          onChange={(d) => {
            setInputValue(d);
          }}
          marker
        />
      </div>
      <div id="map-container" ref={mapContainerRef} />
    </>
  );
}

const getAircraft = async (): Promise<FeatureCollection | undefined> => {
  try {
    const response = await fetch("/api/aircraft");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const aircraftData = await response.json();
    console.log("aircraftData", aircraftData);

    // Transform aircraft data into geoJSON
    const geoJsonAircraftData: FeatureCollection = {
      type: "FeatureCollection",
      features: aircraftData.map((aircraft: any) => {
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [aircraft.geometry.x, aircraft.geometry.y],
          },
          properties: aircraft.attributes,
        };
      }),
    };

    console.log("geoJsonAircraftData", geoJsonAircraftData);
    return geoJsonAircraftData;
  } catch (error) {
    console.error("There was an error:", error);
  }
};

const fireInfoView = (fire: any) => {
  return (
    <>
      <h1>{fire.properties.Name}</h1>
      {fire.properties.IsActive ? (
        <h3>{"Status: Active"}</h3>
      ) : (
        <h3>{`Status: Extinguished on ${fire.properties.ExtinguishedDateOnly}`}</h3>
      )}
      <table>
        <tbody>
          <tr>
            <th>Start Date</th>
            <td>{fire.properties.StartedDateOnly}</td>
          </tr>
          <tr>
            <th>Last Updated</th>
            <td>{fire.properties.Updated}</td>
          </tr>
          <tr>
            <th>Admin Unit</th>
            <td>{fire.properties.AdminUnit}</td>
          </tr>
          <tr>
            <th>County</th>
            <td>{fire.properties.County}</td>
          </tr>
          <tr>
            <th>Location</th>
            <td>{fire.properties.Location}</td>
          </tr>
          <tr>
            <th>Acres Burned</th>
            <td>{fire.properties.AcresBurned}</td>
          </tr>
          <tr>
            <th>Percent Contained</th>
            <td>{fire.properties.PercentContained}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

const aircraftInfoView = (aircraft: any) => {
  return (
    <>
      <h1>{`Identifier: ${aircraft.properties.ident}`}</h1>
      <h2>{`Registration: ${aircraft.properties.reg}`}</h2>
      <table>
        <tbody>
          <tr>
            <th>Function</th>
            <td>{`${aircraft.properties.aircraftFunction}`}</td>
          </tr>
          <tr>
            <th>Heading</th>
            <td>{`${aircraft.properties.heading} deg`}</td>
          </tr>
          <tr>
            <th>Altitude</th>
            <td>{aircraft.properties.alt}</td>
          </tr>
          <tr>
            <th>Ground Speed</th>
            <td>{aircraft.properties.gs}</td>
          </tr>
          <tr>
            <th>Owner</th>
            <td>{aircraft.properties.owner}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default App;
