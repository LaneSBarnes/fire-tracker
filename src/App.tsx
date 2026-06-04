import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { SearchBox } from '@mapbox/search-js-react'
import fireSVG from './assets/fire.svg'
import planeSVG from './assets/airplane.svg'
import { renderToString } from 'react-dom/server';

import 'mapbox-gl/dist/mapbox-gl.css'
import './App.css'

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
const center:[number, number] = [-104.9888567141373, 39.73923582717103];

function App() {
  const mapRef = useRef<mapboxgl.Map | undefined>(undefined)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')

  const fireMarkers: mapboxgl.Marker[] = []
  const aircraftMarkers: mapboxgl.Marker[] = []

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      accessToken,
      style: 'mapbox://styles/mapbox/standard',
      container: mapContainerRef.current!,
      center,
      zoom: 10,
    })

    getFires().then((fireData: any[] | undefined) => {
      if (fireData) {
        const bounds = new mapboxgl.LngLatBounds();

        fireData.forEach((fire: any) => {
          const fireIcon = document.createElement('img');
          fireIcon.className = 'fireIcon'
          fireIcon.src = fireSVG;
          fireIcon.width = 40;
          fireIcon.height = 40;
          if (!fire.IsActive) {
            fireIcon.style.filter = 'grayscale(100%)';
          }
  
          const fireMarker = new mapboxgl.Marker(fireIcon)
            .setLngLat([fire.Longitude, fire.Latitude])
            .setPopup(new mapboxgl.Popup().setHTML(renderToString(fireInfoView(fire))))
            .addTo(mapRef.current!);
  
          fireMarkers.push(fireMarker)
  
          bounds.extend([fire.Longitude, fire.Latitude]);
        });
  
        mapRef.current!.fitBounds(bounds, {
          padding: 100
        });
      }
    });

    setInterval(() => {
      getAircraft().then((aircraftData: any[] | undefined) => {
        if (aircraftData) {
          aircraftMarkers.forEach((marker) => {
            marker.remove()
          })
  
          aircraftData.forEach((aircraft) => {
            if (aircraft.attributes) {
  
            }
            const aircraftIcon = document.createElement('img');
            aircraftIcon.className = 'aircraftIcon'
            aircraftIcon.src = planeSVG;
            aircraftIcon.width = 40;
            aircraftIcon.height = 40;
    
            const aircraftMarker = new mapboxgl.Marker(aircraftIcon)
              .setLngLat([aircraft.geometry.x, aircraft.geometry.y])
              .setRotation(aircraft.attributes.heading)
              .setPopup(new mapboxgl.Popup().setHTML(renderToString(aircraftInfoView(aircraft))))
              .addTo(mapRef.current!);
  
            aircraftMarkers.push(aircraftMarker)
          })
        }
      })
  }, 5000);

    mapRef.current.on('click', (e) => {
      console.log('Click at:', e.lngLat);
    });

    return () => {
      mapRef.current?.remove()
    }
  }, [])

  return (
    <>
        <div style={{
            margin: '10px 10px 0 0',
            width: 300,
            right: 0,
            top: 0,
            position: 'absolute',
            zIndex: 10 }}>
            <SearchBox 
                accessToken={accessToken}
                map={mapRef.current}
                mapboxgl={mapboxgl}
                value={inputValue}
                options={{
                  proximity: center
                }}
                onChange={(d) => {
                    setInputValue(d);
                }}
                marker
            />
        </div>
        <div id='map-container' ref={mapContainerRef} />
    </>
  )
}

const getFires = async (): Promise<any[] | undefined> => {
  try {
    const response = await fetch('/api/fire/List?inactive=true'); // use GeoJsonList?
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const fireData = await response.json();
    // console.log("fireData", fireData);
    return fireData
  } catch (error) {
    console.error('There was an error:', error);
  }
}

const getAircraft = async (): Promise<any[] | undefined> => {
  try {
    const response = await fetch('/api/aircraft');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const aircraftData = await response.json();
    // console.log("aircraftData", aircraftData);
    return aircraftData
  } catch (error) {
    console.error('There was an error:', error);
  }
}

const fireInfoView = (fire: any) => {
  return (
    <>
      <h1>{fire.Name}</h1>
      {fire.IsActive ? 
        <h3>{'Status: Active'}</h3> :
        <h3>{`Status: Extinguished on ${fire.ExtinguishedDateOnly}`}</h3>}
      <table>
        <tbody>
          <tr>
            <th>Start Date</th>
            <td>{fire.StartedDateOnly}</td>
          </tr>
          <tr>
            <th>Last Updated</th>
            <td>{fire.Updated}</td>
          </tr>
          <tr>
            <th>Admin Unit</th>
            <td>{fire.AdminUnit}</td>
          </tr>
          <tr>
            <th>County</th>
            <td>{fire.County}</td>
          </tr>
          <tr>
            <th>Location</th>
            <td>{fire.Location}</td>
          </tr>
          <tr>
            <th>Acres Burned</th>
            <td>{fire.AcresBurned}</td>
          </tr>
          <tr>
            <th>Percent Contained</th>
            <td>{fire.PercentContained}</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

const aircraftInfoView = (aircraft: any) => {
  return (
    <>
      <h1>{aircraft.attributes.ident}</h1>
      <table>
        <tbody>
          <tr>
            <th>Heading</th>
            <td>{`${aircraft.attributes.heading} deg`}</td>
          </tr>
          <tr>
            <th>Altitude</th>
            <td>{aircraft.attributes.alt}</td>
          </tr>
          <tr>
            <th>Owner</th>
            <td>{aircraft.attributes.owner}</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

export default App