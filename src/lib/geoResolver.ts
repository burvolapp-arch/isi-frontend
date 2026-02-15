// ============================================================================
// DELETED — geoResolver.ts
// ============================================================================
// This module has been intentionally removed.
//
// The EU choropleth now uses strict ISO-2 alignment:
//   - Backend: ISICompositeCountry.country (ISO-2, e.g. "AT")
//   - TopoJSON: feature.properties.ISO_A2 (ISO-2, e.g. "AT")
//
// Matching is a single Map<string, ISICompositeCountry> keyed by
// uppercase ISO-2. No fallback strategies. No fuzzy matching.
//
// All resolution logic lives directly in src/components/EUMap.tsx.
// ============================================================================
//
// If you are seeing an import error referencing this file,
// the import was removed from EUMap.tsx and should not exist anywhere.
// Run: grep -r "geoResolver" src/ to verify.
// ============================================================================

