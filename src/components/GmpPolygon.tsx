import React, { useContext, useEffect, useRef } from 'react';
import { GoogleMapsContext } from '@vis.gl/react-google-maps';

export interface PolygonProps extends google.maps.PolygonOptions {
  paths: google.maps.LatLngLiteral[] | google.maps.LatLngLiteral[][];
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onMouseOver?: (e: google.maps.MapMouseEvent) => void;
  onMouseOut?: (e: google.maps.MapMouseEvent) => void;
}

export const GmpPolygon = React.forwardRef<google.maps.Polygon, PolygonProps>((props, ref) => {
  const { paths, onClick, onMouseOver, onMouseOut, ...options } = props;
  const context = useContext(GoogleMapsContext);
  const map = context?.map;

  const polygon = useRef<google.maps.Polygon | null>(null);

  // Create polygon once map is loaded
  useEffect(() => {
    if (!map) return;
    const poly = new google.maps.Polygon({
      ...options,
      paths: paths,
    });
    poly.setMap(map);
    polygon.current = poly;

    if (ref) {
      if (typeof ref === 'function') {
        ref(poly);
      } else {
        (ref as React.MutableRefObject<google.maps.Polygon | null>).current = poly;
      }
    }

    return () => {
      poly.setMap(null);
      polygon.current = null;
      if (ref) {
        if (typeof ref === 'function') {
          ref(null);
        } else {
          (ref as React.MutableRefObject<google.maps.Polygon | null>).current = null;
        }
      }
    };
  }, [map]);

  // Update options when they change
  useEffect(() => {
    if (polygon.current) {
      polygon.current.setOptions(options);
    }
  }, [options]);

  // Update paths when they change
  useEffect(() => {
    if (polygon.current) {
      polygon.current.setPaths(paths);
    }
  }, [paths]);

  // Listeners
  useEffect(() => {
    const poly = polygon.current;
    if (!poly) return;

    const listeners: google.maps.MapsEventListener[] = [];

    if (onClick) {
      listeners.push(google.maps.event.addListener(poly, 'click', onClick));
    }
    if (onMouseOver) {
      listeners.push(google.maps.event.addListener(poly, 'mouseover', onMouseOver));
    }
    if (onMouseOut) {
      listeners.push(google.maps.event.addListener(poly, 'mouseout', onMouseOut));
    }

    return () => {
      listeners.forEach(l => l.remove());
    };
  }, [onClick, onMouseOver, onMouseOut, paths]);

  return null;
});

GmpPolygon.displayName = 'GmpPolygon';
