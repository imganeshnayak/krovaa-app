import React from 'react';
import { View, Text, Image, ImageProps, StyleSheet, ViewStyle, ImageStyle, TextStyle } from 'react-native';

type AvatarProps = {
  source?: ImageProps['source'];
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  fallbackContent?: React.ReactNode;
  rounded?: boolean;
};

type AvatarFallbackProps = {
  style?: ViewStyle;
  textStyle?: TextStyle;
  backgroundColor?: string;
  textColor?: string;
};

type AvatarImageProps = ImageProps & {
  style?: ImageStyle;
};

export const Avatar = ({
  source,
  size = 40,
  style,
  imageStyle,
  fallbackContent,
  rounded = true,
}: AvatarProps) => {
  const avatarStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: rounded ? size / 2 : 0,
    overflow: 'hidden',
    ...style,
  };

  const imageStyleObj: ImageStyle = {
    width: '100%',
    height: '100%',
    ...imageStyle,
  };

  if (!source) {
    return (
      <View style={avatarStyle}>
        {fallbackContent ?? <AvatarFallback />}
      </View>
    );
  }

  return (
    <View style={avatarStyle}>
      <Image source={source} style={imageStyleObj} />
    </View>
  );
};

export const AvatarFallback = ({
  style,
  textStyle,
  backgroundColor = '#00A4EF',
  textColor = '#FFFFFF',
}: AvatarFallbackProps) => {
  return (
    <View style={[styles.fallback, { backgroundColor }, style]}>
      <Text style={[styles.fallbackText, { color: textColor }, textStyle]}>
        ?
      </Text>
    </View>
  );
};

export const AvatarImage = (props: AvatarImageProps) => {
  return <Image {...props} style={[{ width: '100%', height: '100%' }, props.style]} />;
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '600',
  },
});

export default Avatar;